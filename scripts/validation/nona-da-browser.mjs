import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const { chromium } = createRequire(resolve(root, "../tools/package.json"))("playwright");
const output = resolve(root, "docs/evidence/da/after");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--disable-background-networking", "--no-first-run", "--disable-gpu"],
});
const evidence = {
  checkedAt: new Date().toISOString(),
  scope: "Local shared UI; demo data and simulated actions",
  externalRequestsBlocked: [],
  pageErrors: [],
  viewports: [],
  manager: null,
  simulatedReservationSubmitted: false,
  passed: false,
};

async function newPage(width) {
  const page = await browser.newPage({
    viewport: { width, height: 1000 },
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  });
  page.on("pageerror", (error) => evidence.pageErrors.push(error.message));
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1" || !["4182", "4183"].includes(url.port)) {
      evidence.externalRequestsBlocked.push(url.origin);
      return route.abort();
    }
    return route.continue();
  });
  return page;
}
async function ready(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = [...document.images];
    images.forEach((image) => {
      image.loading = "eager";
    });
    await Promise.all(
      images.map((image) =>
        image.complete
          ? Promise.resolve()
          : new Promise((done) => {
              image.onload = done;
              image.onerror = done;
            }),
      ),
    );
  });
}
try {
  for (const width of [360, 390, 430, 1440]) {
    const page = await newPage(width);
    await page.goto("http://127.0.0.1:4182/nona");
    await page.locator(".hb-section-card").first().waitFor();
    await page.locator(".nona-launcher").waitFor();
    await ready(page);
    const layout = await page.evaluate(() => ({
      width: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      gridColumns: getComputedStyle(
        document.querySelector(".hb-index-content > .hb-section-grid"),
      ).gridTemplateColumns.split(" ").length,
      primarySections: document.querySelectorAll(".hb-index-content > .hb-section-grid > button")
        .length,
      touchHeights: [
        ...document.querySelectorAll(".hb-index-content > .hb-section-grid > button"),
      ].map((item) => item.getBoundingClientRect().height),
      servicesBelowSections:
        document.querySelector(".nona-home-services").getBoundingClientRect().top >=
        document.querySelector(".hb-index-content > .hb-section-grid").getBoundingClientRect()
          .bottom,
      serviceCards: document.querySelectorAll(".hb-service-rail article").length,
    }));
    assert.ok(layout.documentWidth <= width + 1, JSON.stringify(layout));
    assert.equal(layout.gridColumns, 2);
    assert.equal(layout.primarySections, 4);
    assert.ok(layout.touchHeights.every((height) => height >= 44));
    assert.equal(layout.servicesBelowSections, true);
    await page.screenshot({ path: resolve(output, `guide-${width}.png`), fullPage: true });
    if (width === 390) {
      const rail = page.locator(".hb-service-rail");
      await rail.scrollIntoViewIfNeeded();
      const horizontal = await rail.evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
        return element.scrollWidth > element.clientWidth;
      });
      assert.equal(horizontal, true);
      await page.screenshot({ path: resolve(output, "services-390.png") });
      await page.locator(".nona-launcher").click();
      await page.locator(".nona-panel:not([hidden])").waitFor();
      const panel = await page.locator(".nona-panel").boundingBox();
      assert.ok(panel.width <= width + 1 && panel.height <= 1001);
      await page.screenshot({ path: resolve(output, "chat-390.png") });
      await page.getByRole("button", { name: "Fermer Nona", exact: true }).click();
      await page.locator(".hb-service-rail").evaluate((element) => {
        element.scrollLeft = 0;
      });
      await page.locator(".hb-service-rail button").first().click();
      await page.locator(".hb-service-list:not(.hb-service-rail) button").first().click();
      await page.locator(".nona-demo-booking-dialog").waitFor();
      assert.ok(await page.locator(".nona-demo-booking-dialog form").count());
      await page.screenshot({ path: resolve(output, "booking-390.png") });
      const booking = page.locator(".nona-demo-booking-dialog");
      const details = booking.locator("details").first();
      if ((await details.getAttribute("open")) === null) await details.locator("summary").click();
      for (const select of await booking.locator("select").all()) {
        const value = await select.locator("option").nth(1).getAttribute("value");
        await select.selectOption(value);
      }
      const identity = booking.locator('input:not([type]), input[type="text"]');
      await identity.nth(0).fill("Voyageur Recette");
      await identity.nth(1).fill("recette@example.invalid");
      await booking.locator('input[type="number"]').fill("2");
      await booking.locator('input[type="checkbox"]').check();
      await booking.locator("form button").last().click();
      await booking.getByText("Demande enregistrée", { exact: true }).waitFor();
      evidence.simulatedReservationSubmitted = true;
      await page.screenshot({ path: resolve(output, "booking-receipt-390.png") });
      await page.keyboard.press("Escape");
    }
    evidence.viewports.push(layout);
    await page.close();
  }
  const page = await newPage(1440);
  await page.goto("http://127.0.0.1:4183/demo?preview=manager");
  await page.waitForFunction(
    () => sessionStorage.getItem("hostbuddy.demo.properties.v1.fr") !== null,
  );
  await page.locator(".manager-property-card").first().waitFor();
  await ready(page);
  evidence.manager = await page.evaluate(() => ({
    columns: getComputedStyle(
      document.querySelector(".manager-property-grid"),
    ).gridTemplateColumns.split(" ").length,
    documentWidth: document.documentElement.scrollWidth,
    initialCards: document.querySelectorAll(".manager-property-card").length,
  }));
  assert.equal(evidence.manager.columns, 3);
  assert.ok(evidence.manager.documentWidth <= 1441);
  await page.screenshot({ path: resolve(output, "manager-1440.png"), fullPage: true });
  await page.getByRole("searchbox").fill("Villa Mare");
  assert.equal(await page.locator(".manager-property-card").count(), 1);
  await page.getByRole("searchbox").fill("");
  await page.locator(".manager-property-filters button").filter({ hasText: "Brouillons" }).click();
  assert.equal(await page.locator(".manager-property-card").count(), 2);
  await page.locator(".manager-property-filters button").first().click();
  await page.locator(".manager-property-quick-actions button").first().click();
  await page.getByRole("button", { name: "Publier les modifications", exact: true }).waitFor();
  await page.screenshot({ path: resolve(output, "editor-1440.png"), fullPage: true });
  await page.getByRole("button", { name: "Publier les modifications", exact: true }).click();
  await page.getByRole("button", { name: "Services", exact: true }).first().click();
  await page.screenshot({ path: resolve(output, "services-editor-1440.png"), fullPage: true });
  for (const [label, name] of [
    ["Messages", "messages"],
    ["Commandes", "orders"],
    ["Tableau de bord", "dashboard"],
    ["Équipe", "team"],
    ["Paiements", "payments"],
  ]) {
    await page
      .locator(".manager-shell-sidebar")
      .getByRole("button", { name: label, exact: true })
      .click();
    assert.ok(await page.locator(".manager-shell-content h1").count());
    await page.screenshot({ path: resolve(output, `${name}-1440.png`), fullPage: true });
  }
  for (const mode of ["login", "signup"]) {
    await page.goto(`http://127.0.0.1:4183/auth?mode=${mode}`);
    await page.locator(".nona-auth form").waitFor();
    await ready(page);
    await page.screenshot({ path: resolve(output, `auth-${mode}-1440.png`), fullPage: true });
  }
  assert.deepEqual(evidence.pageErrors, []);
  evidence.passed = true;
} finally {
  await browser.close();
  await writeFile(
    resolve(root, "docs/evidence/nona-da-browser-20261017.json"),
    JSON.stringify(evidence, null, 2),
  );
}
console.log(JSON.stringify(evidence));
