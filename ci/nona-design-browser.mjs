import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const { chromium } = await import(process.env.HOSTBUDDY_PLAYWRIGHT_MODULE);
const browser = await chromium.launch({ headless: true });
const deadline = setTimeout(() => {
  console.error("Design browser time limit exceeded");
  process.exit(1);
}, 180000);
deadline.unref();
const results = {
  scope: "Synthetic shared GuideView, guided backend; no real AI validation",
  checks: [],
  errors: [],
  chatCalls: 0,
};
try {
  for (const width of [390, 1440]) {
    for (const locale of ["fr", "en", "es", "de", "it", "pt"]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        locale: "fr-FR",
        timezoneId: "Europe/Paris",
      });
      const page = await context.newPage();
      page.on("pageerror", (error) => results.errors.push(error.message));
      await context.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/chat") results.chatCalls++;
        return url.origin === "http://127.0.0.1:4196" ? route.continue() : route.abort();
      });
      await page.addInitScript(
        (language) => localStorage.setItem("hostbuddy.locale", language),
        locale,
      );
      const localized = page.waitForResponse((response) => {
        const url = new URL(response.url());
        return url.pathname === "/local-guide" && url.searchParams.get("locale") === locale;
      });
      await page.goto("http://127.0.0.1:4196/");
      await localized;
      await page.locator(".hb-section-card").first().waitFor();
      await page.evaluate(async () => {
        await document.fonts.ready;
        const images = [...document.images];
        images.forEach((image) => {
          image.loading = "eager";
        });
        await Promise.race([
          Promise.all(images.map((image) => image.decode().catch(() => {}))),
          new Promise((resolve) => setTimeout(resolve, 10000)),
        ]);
      });
      const layout = await page.evaluate(() => {
        const box = (selector) => document.querySelector(selector).getBoundingClientRect();
        const grid = document.querySelector(".hb-index-content > .hb-section-grid");
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          coverBottom: box(".nona-property-visual").bottom,
          sectionsTop: grid.getBoundingClientRect().top,
          columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
          sectionCount: grid.children.length,
          servicesAfterSections:
            box(".nona-home-services").top >= grid.getBoundingClientRect().bottom,
        };
      });
      assert.equal(layout.overflow, false, `${width}/${locale}: horizontal overflow`);
      assert.equal(layout.columns, 2);
      assert.ok(
        layout.sectionsTop >= layout.coverBottom,
        `${width}/${locale}: sections must follow cover`,
      );
      assert.ok(layout.servicesAfterSections);
      await page.screenshot({
        path: `qa-results/layout-${width}-${locale}.png`,
        fullPage: true,
      });
      await page.locator(".hb-section-card").first().click();
      await page.locator(".hb-section-page").waitFor();
      results.checks.push({ width, locale, layout, navigation: true });
      await context.close();
    }
  }
  assert.deepEqual(results.errors, []);
  assert.equal(results.chatCalls, 0);
  results.passed = true;
} finally {
  await writeFile("qa-results/design-layout.json", JSON.stringify(results, null, 2));
  clearTimeout(deadline);
  await browser.close();
}
