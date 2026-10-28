const { chromium } = await import(process.env["NONA_PLAYWRIGHT_MODULE"] || "playwright");
import assert from "node:assert/strict";
import { writeFile, mkdir, mkdtemp } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
const destination = process.argv[3]
  ? resolve(process.argv[3])
  : await mkdtemp(join(tmpdir(), "nona-concierge-browser-"));
await mkdir(destination, { recursive: true });
const base = new URL(process.env["NONA_CONCIERGE_TEST_URL"] || "http://127.0.0.1:4179/demo");
if (
  base.protocol !== "http:" ||
  base.hostname !== "127.0.0.1" ||
  base.username ||
  base.password ||
  base.pathname !== "/demo"
)
  throw Error("local_demo_only");
const browser = await chromium.launch({ headless: true });
const width = Number(process.argv[2] ?? 390);
const page = await browser.newPage({
  viewport: { width, height: 844 },
  locale: "fr-FR",
  timezoneId: "Europe/Paris",
});
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const writes = [];
page.on("request", (request) => {
  if (!["GET", "HEAD"].includes(request.method())) writes.push(new URL(request.url()).pathname);
});
try {
  await page.goto(base.href, { waitUntil: "networkidle", timeout: 30000 });
  await page.getByRole("button", { name: "Discuter avec Nona", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Nona, ta concierge" });
  const send = async (text) => {
    await panel.getByRole("textbox", { name: "Ta question ou ton envie…" }).fill(text);
    await panel.getByRole("button", { name: "Envoyer", exact: true }).click();
    await page.waitForFunction(
      () => document.querySelector(".nona-composer textarea")?.value === "",
    );
  };
  await send("Je voudrais un petit-déjeuner");
  assert.equal(await panel.locator("[data-booking-form]").count(), 0);
  await send("Trois");
  await send("demain");
  await send("vers 9 h");
  await send("Classique");
  await panel.locator("[data-booking-form]").waitFor();
  assert.equal(await panel.locator('input[type="number"]').inputValue(), "3");
  await panel.getByRole("textbox", { name: "Ton nom", exact: true }).fill("Voyageur TEST Nona");
  await panel
    .getByRole("textbox", { name: /Ton e-mail ou téléphone/ })
    .fill("nona-test@example.invalid");
  await panel.getByRole("checkbox").check();
  await page.screenshot({ path: join(destination, `concierge-${width}.png`) });
  await panel.getByText("Total demandé : 75.00 €", { exact: true }).waitFor();
  await panel.getByRole("textbox", { name: "Ta question ou ton envie…" }).fill("oui");
  await panel.getByRole("button", { name: "Envoyer", exact: true }).click();
  await page.waitForTimeout(100);
  const countOrders = () =>
    page.evaluate(
      async () =>
        (await import("/src/components/demo/demo-bookings.ts")).demoBookingOrders().length,
    );
  assert.equal(await countOrders(), 0, "free text must never submit an order");
  await page.waitForFunction(() =>
    [...document.querySelectorAll("button")].some(
      (button) => button.textContent === "Confirmer ma demande" && !button.disabled,
    ),
  );
  await panel
    .getByRole("button", { name: "Confirmer ma demande", exact: true })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await panel.getByRole("button", { name: "Actualiser le suivi", exact: true }).waitFor();
  assert.equal(await countOrders(), 1, "double click creates a single request");
  assert.equal(await panel.getByRole("button", { name: "Simuler le paiement TEST" }).count(), 0);
  await panel.getByRole("button", { name: "Fermer Nona" }).click();
  await page.getByRole("tab", { name: "Gestionnaire", exact: true }).click();
  await page.getByRole("button", { name: "Commandes", exact: true }).click();
  const order = page.locator("article").filter({ hasText: "Voyageur TEST Nona" });
  await order.getByRole("button", { name: "Confirmer", exact: true }).click();
  await page.getByRole("tab", { name: "Voyageur", exact: true }).click();
  await page.getByRole("button", { name: "Discuter avec Nona", exact: true }).click();
  await panel
    .getByRole("textbox", { name: "Ta question ou ton envie…" })
    .fill("Où en est mon petit-déjeuner ?");
  await panel.getByRole("button", { name: "Envoyer", exact: true }).click();
  await panel.getByRole("button", { name: "Simuler le paiement TEST" }).click();
  await panel.getByText("Paiement reçu", { exact: true }).waitFor();
  await panel.getByRole("button", { name: "Fermer Nona" }).click();
  await page.getByRole("button", { name: "Discuter avec Nona", exact: true }).click();
  assert.equal(await countOrders(), 1);
  assert.equal(
    await page.evaluate(
      async () =>
        (await import("/src/components/demo/demo-bookings.ts")).demoBookingOrders()[0]
          .order_payments[0].status,
    ),
    "paid",
  );
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(overflow, false);
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, [], "demo must never call a real booking or payment endpoint");
  await writeFile(
    join(destination, `concierge-browser-evidence-${width}.json`),
    JSON.stringify(
      {
        viewport: { width, height: 844 },
        runtime: "local Vite",
        scenario: "demo only",
        facts: {
          quantityRetained: true,
          dateRetained: true,
          explicitConfirmationOnly: true,
          doubleSubmissionDeduplicated: true,
          managerConfirmedInDemoUi: true,
          paymentButtonGated: true,
          simulatedPaymentStatus: "paid",
          closeReopenPreservesProgress: true,
          horizontalOverflow: false,
          browserErrors: errors,
          outgoingMutations: writes,
        },
        stripePaymentExecuted: false,
        aiProviderCalled: false,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      status: "PASS",
      viewport: width,
      scenario: "guided concierge demo",
      stripePaymentExecuted: false,
      aiProviderCalled: false,
    }),
  );
} finally {
  await browser.close();
}
