import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const { chromium } = createRequire(resolve(root, "../tools/package.json"))("playwright");
const origin = "http://127.0.0.1:4182";
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--disable-background-networking", "--no-first-run", "--disable-gpu"],
});
const evidence = {
  checkedAt: new Date().toISOString(),
  externalRequests: [],
  transactionRequests: [],
  simulatedBooking: false,
  errors: [],
  checks: [],
  passed: false,
};
const cases = [
  ["wifi", ["Nona, comment je me connecte au Wi-Fi ?"]],
  [
    "petit-dejeuner",
    ["Je voudrais un petit-déjeuner", "Pour deux personnes", "Demain", "09:00", "Classique"],
  ],
  [
    "massage",
    ["Je voudrais un massage, mes épaules sont nouées", "Pour deux personnes", "Demain", "14:00"],
  ],
  ["arrivee-anticipee", ["Est-ce que je peux arriver plus tôt que prévu ?"]],
  ["restaurant-italien", ["Tu me conseilles un restaurant italien ?"]],
];
if (process.argv[2] && !cases.some(([name]) => name === process.argv[2]))
  throw new Error("Unknown NONA browser scenario");
try {
  await mkdir(resolve(root, "docs/evidence"), { recursive: true });
  for (const [name, messages] of cases.filter(
    ([name]) => !process.argv[2] || name === process.argv[2],
  )) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: "fr-FR",
      timezoneId: "Europe/Paris",
    });
    context.setDefaultTimeout(20000);
    await context.route("**/*", async (route) => {
      if (/\/(api\/public|pay)\//.test(new URL(route.request().url()).pathname)) {
        evidence.transactionRequests.push(route.request().url());
        return route.abort();
      }
      if (new URL(route.request().url()).origin !== origin) {
        evidence.externalRequests.push(route.request().url());
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => evidence.errors.push(error.message));
    await page.goto(origin + "/nona");
    await page.locator(".nona-launcher").click();
    await page.locator(".nona-header").filter({ hasText: "IA locale" }).waitFor();
    for (const message of messages) {
      await page.locator(".nona-composer textarea").fill(message);
      const result = page.waitForResponse(
        (r) => r.url() === origin + "/chat" && r.request().postDataJSON().message === message,
        { timeout: 130000 },
      );
      await page.locator(".nona-composer button[type=submit]").click();
      const response = await result;
      const turn = await response.json();
      assert.equal(response.status(), 200, JSON.stringify(turn));
      assert.equal(turn.provider, "ollama-local");
      assert.equal(turn.mode, "ai");
      assert.equal(turn.usage.estimatedCostMicros, 0);
      await page.getByText(turn.text, { exact: true }).first().waitFor();
      await page.waitForFunction(
        () => document.querySelector(".nona-composer textarea").value === "",
        undefined,
        { timeout: 15000 },
      );
      evidence.checks.push({
        scenario: name,
        message,
        text: turn.text,
        nextStep: turn.nextStep,
        provider: turn.provider,
        modelCalls: turn.usage.modelCalls,
      });
      console.log(name + ": " + turn.nextStep);
    }
    if (name === "wifi")
      assert.match(await page.locator(".nona-panel").innerText(), /VillaMare_5G/);
    if (["petit-dejeuner", "massage"].includes(name)) {
      await page.locator(".nona-booking-card form").waitFor();
      assert.equal(evidence.checks.at(-1).nextStep, "ready");
      assert.equal(await page.locator(".nona-concierge").getAttribute("data-demo"), "true");
      assert.equal(await page.locator(".nona-booking-card a[href^='/pay/']").count(), 0);
    }
    if (name === "petit-dejeuner") {
      const form = page.locator(".nona-booking-card form");
      await form.getByLabel("Ton nom", { exact: true }).fill("Recette NONA");
      await form.locator("input:not([type])").nth(1).fill("recette@example.invalid");
      for (const checkbox of await form.locator("input[type=checkbox]").all())
        await checkbox.check();
      await form.getByRole("button", { name: "Confirmer ma demande", exact: true }).click();
      await page.locator(".nona-booking-card [role=status]").waitFor();
      assert.equal(await page.locator(".nona-booking-card form").count(), 0);
      evidence.simulatedBooking = true;
    }
    assert.equal(await page.locator(".nona-panel [role=alert]").count(), 0);
    await page.screenshot({
      path: resolve(root, `docs/evidence/nona-interface-${name}-20261017.png`),
      fullPage: true,
    });
    await context.close();
  }
  assert.deepEqual(evidence.externalRequests, []);
  assert.deepEqual(evidence.transactionRequests, []);
  if (!process.argv[2] || process.argv[2] === "petit-dejeuner")
    assert.equal(evidence.simulatedBooking, true);
  assert.deepEqual(evidence.errors, []);
  evidence.passed = true;
} finally {
  await browser.close();
  await writeFile(
    resolve(
      root,
      `docs/evidence/nona-interface${process.argv[2] ? `-${process.argv[2]}` : ""}-20261017.json`,
    ),
    JSON.stringify(evidence, null, 2),
  );
}
console.log(
  JSON.stringify({
    passed: evidence.passed,
    turns: evidence.checks.length,
    externalRequests: evidence.externalRequests.length,
    pageErrors: evidence.errors.length,
  }),
);
