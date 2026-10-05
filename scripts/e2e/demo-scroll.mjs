// Run with a local dev/preview server and Playwright Chromium installed.
// HOSTBUDDY_PLAYWRIGHT_MODULE may point to the runtime's playwright-core module.
import assert from "node:assert/strict";
const { chromium } = await import(process.env.HOSTBUDDY_PLAYWRIGHT_MODULE || "playwright-core");
const browser = await chromium.launch({
  headless: true,
  ...(process.env.HOSTBUDDY_CHROMIUM ? { executablePath: process.env.HOSTBUDDY_CHROMIUM } : {}),
});
const origin = process.env.HOSTBUDDY_TEST_ORIGIN || "http://127.0.0.1:5173";
const evidence = [];
try {
  for (const [width, height] of [
    [360, 800],
    [390, 844],
    [430, 932],
    [768, 1024],
    [1440, 1000],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      locale: "fr-FR",
      isMobile: width < 500,
      hasTouch: width < 500,
    });
    const page = await context.newPage();
    for (const route of ["/", "/demo"]) {
      await page.goto(origin + route);
      const demo = page.locator(".demo-container");
      await demo.waitFor();
      for (const mode of ["guest", "manager"]) {
        await demo
          .getByRole("tab")
          .nth(mode === "guest" ? 0 : 1)
          .click();
        const owner =
          mode === "guest"
            ? demo.locator(".demo-viewport")
            : demo.locator(".manager-shell-content");
        if (mode === "manager" && width >= 768) {
          // The desktop property list can fit; open the existing editor for long content.
          await demo.locator(".manager-property-card").first().getByRole("button").first().click();
        }
        await demo.scrollIntoViewIfNeeded();
        const state = await owner.evaluate((el) => ({
          h: el.clientHeight,
          sh: el.scrollHeight,
          overflow: getComputedStyle(el).overflowY,
          chain: getComputedStyle(el).overscrollBehaviorY,
        }));
        assert.equal(state.overflow, "auto");
        assert.equal(state.chain, "auto");
        assert.ok(state.h > 0 && state.sh > state.h, `scrollable ${route} ${mode} ${width}`);
        await owner.evaluate((el) => {
          el.scrollTop = 0;
        });
        const box = await owner.boundingBox();
        const x = box.x + box.width / 2,
          y = Math.min(height - 110, Math.max(150, box.y + 100));
        await page.mouse.move(x, y);
        await page.mouse.wheel(0, 250);
        await page.waitForTimeout(250);
        assert.ok((await owner.evaluate((el) => el.scrollTop)) > 0, "internal scroll moves");
        if (route === "/") {
          await owner.evaluate((el) => {
            el.scrollTop = el.scrollHeight;
          });
          const before = await page.evaluate(() => scrollY);
          await page.mouse.wheel(0, 250);
          await page.waitForTimeout(250);
          assert.ok((await page.evaluate(() => scrollY)) > before, "bottom chains to document");
          await demo.scrollIntoViewIfNeeded();
          await owner.evaluate((el) => {
            el.scrollTop = 0;
          });
          const next = await owner.boundingBox();
          await page.mouse.move(
            next.x + next.width / 2,
            Math.min(height - 110, Math.max(150, next.y + 100)),
          );
          const up = await page.evaluate(() => scrollY);
          await page.mouse.wheel(0, -250);
          await page.waitForTimeout(250);
          assert.ok((await page.evaluate(() => scrollY)) < up, "top chains to document");
        }
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
          "no horizontal overflow",
        );
        evidence.push({ route, mode, width, height, ...state, wheelPassed: true });
      }
    }
    if (width === 390) {
      await page.goto(origin + "/");
      await page.locator(".demo-container").scrollIntoViewIfNeeded();
      const owner = page.locator(".demo-container .demo-viewport");
      const box = await owner.boundingBox();
      const cdp = await context.newCDPSession(page);
      const x = Math.round(box.x + box.width / 2),
        y = Math.min(height - 180, Math.round(box.y + 180));
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      for (let i = 1; i <= 10; i++)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x, y: y - i * 10 }],
        });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.waitForTimeout(300);
      assert.ok((await owner.evaluate((el) => el.scrollTop)) > 0, "touch swipe scrolls guest");
      evidence.push({ width, touchPassed: true });
    }
    await context.close();
  }
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
