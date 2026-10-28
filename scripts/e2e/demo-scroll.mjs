// Browser regression coverage; this is not an unassisted UX discovery experiment.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
const { chromium } = await import(process.env.HOSTBUDDY_PLAYWRIGHT_MODULE || "playwright-core");
const browser = await chromium.launch({
  headless: true,
  ...(process.env.HOSTBUDDY_CHROMIUM ? { executablePath: process.env.HOSTBUDDY_CHROMIUM } : {}),
});
const origin = process.env.HOSTBUDDY_TEST_ORIGIN || "http://127.0.0.1:5173";
const output = process.env.RUNNER_TEMP || "/tmp";
await mkdir(output, { recursive: true });
const evidence = [],
  failures = [];
const metrics = (target) =>
  target.evaluate(() => ({
    top: scrollY,
    height: innerHeight,
    width: innerWidth,
    scrollHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
  }));
async function swipe(context, page, x, y) {
  const cdp = await context.newCDPSession(page);
  try {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let step = 1; step <= 12; step++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y - step * 12 }],
      });
      await page.waitForTimeout(20);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(350);
  } finally {
    await cdp.detach();
  }
}
try {
  for (const [width, height] of [
    [360, 800],
    [390, 844],
    [430, 932],
    [768, 1024],
    [820, 1180],
    [1024, 900],
    [1440, 1000],
  ]) {
    for (const [label, route] of [
      ["home", "/"],
      ["guest", "/demo?mode=guest"],
      ["manager", "/demo?mode=manager"],
    ]) {
      const context = await browser.newContext({
        viewport: { width, height },
        locale: "fr-FR",
        isMobile: width < 500,
        hasTouch: width < 500,
      });
      await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
      const page = await context.newPage();
      const record = { route, width, height, clicks: 0, pageErrors: [] };
      page.on("pageerror", (error) => record.pageErrors.push(error.message));
      const stem = join(output, `hb-scroll-${label}-${width}`);
      try {
        await page.goto(origin + route);
        if (label === "home") {
          const iframe = page.locator('.hb-marketing-phone iframe[src^="/phone-preview"]');
          await iframe.scrollIntoViewIfNeeded();
          await iframe.waitFor({ state: "visible" });
          const phone = await (await iframe.elementHandle()).contentFrame();
          await phone.locator(".hb-cover").waitFor();
          await page.waitForTimeout(300);
          const before = await metrics(phone);
          assert.equal(before.width, 390, "Phone keeps real 390 CSS-pixel viewport");
          assert.equal(before.height, 844, "Phone keeps real 844 CSS-pixel viewport");
          assert.ok(before.scrollHeight > before.height, "Phone content exists below cover");
          const box = await iframe.boundingBox();
          assert.ok(box && box.width > 0);
          const x = box.x + box.width * 0.5;
          const y = Math.min(height - 100, Math.max(120, box.y + box.height * 0.5));
          await page.mouse.move(x, y);
          await page.mouse.wheel(0, 300);
          await page.waitForTimeout(350);
          record.phoneBefore = before;
          record.phoneAfterWheel = await metrics(phone);
          assert.ok(record.phoneAfterWheel.top > before.top, "Wheel moves phone document");
          if (width < 500) {
            await phone.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
            await swipe(context, page, x, y);
            record.phoneAfterTouch = await metrics(phone);
            assert.ok(record.phoneAfterTouch.top > 0, "Touch moves phone document");
          }
          assert.ok((await metrics(phone)).scrollWidth <= 391, "No horizontal phone overflow");
          await page.screenshot({ path: `${stem}.png`, fullPage: true });
          await page.mouse.move(8, height * 0.5);
          const outerBefore = (await metrics(page)).top;
          await page.mouse.wheel(0, 300);
          await page.waitForTimeout(350);
          record.outerAfterWheel = await metrics(page);
          assert.ok(
            record.outerAfterWheel.top > outerBefore,
            "Marketing page scrolls outside phone",
          );
        } else {
          const demo = page.locator(".demo-container");
          await demo.waitFor({ state: "visible" });
          assert.equal(
            await demo.getAttribute("data-layout"),
            "page",
            "Full demo uses document scrolling",
          );
          if (label === "manager") {
            await demo.getByRole("button", { name: "Modifier Villa Mare", exact: true }).click();
            record.clicks++;
            await page.locator(".section-organizer").waitFor();
          } else await demo.locator(".hb-cover").waitFor();
          await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
          await page.waitForTimeout(300);
          record.before = await metrics(page);
          assert.ok(record.before.scrollHeight > height, "Demo content exists below fold");
          // Right-side content avoids the intentionally scrollable manager section rail.
          await page.mouse.move(width * 0.8, height * 0.6);
          await page.mouse.wheel(0, 300);
          await page.waitForTimeout(350);
          record.afterWheel = await metrics(page);
          assert.ok(record.afterWheel.top > 0, "Wheel moves full demo document");
          if (width < 500) {
            await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
            await swipe(context, page, width * 0.8, height * 0.65);
            record.afterTouch = await metrics(page);
            assert.ok(record.afterTouch.top > 0, "Touch moves full demo document");
          }
          await page.screenshot({ path: `${stem}.png`, fullPage: true });
          for (let step = 0; step < 40; step++) {
            const state = await metrics(page);
            if (state.top + state.height >= state.scrollHeight - 2) break;
            await page.mouse.wheel(0, 1000);
            await page.waitForTimeout(70);
          }
          record.bottom = await metrics(page);
          assert.ok(
            record.bottom.top + height >= record.bottom.scrollHeight - 2,
            "Bottom reachable with native wheel",
          );
          await page.mouse.wheel(0, -400);
          await page.waitForTimeout(350);
          assert.ok(
            (await metrics(page)).top < record.bottom.top,
            "Can leave bottom without scroll trap",
          );
        }
        assert.ok(
          (await metrics(page)).scrollWidth <= width + 1,
          "No horizontal document overflow",
        );
        assert.deepEqual(record.pageErrors, [], "No uncaught browser errors");
        record.passed = true;
      } catch (error) {
        record.passed = false;
        record.error = String(error);
        failures.push(record);
        await page.screenshot({ path: `${stem}-failure.png`, fullPage: true }).catch(() => {});
      } finally {
        evidence.push(record);
        console.log(JSON.stringify(record));
        await context.tracing.stop({ path: `${stem}-trace.zip` });
        await context.close();
      }
    }
  }
} finally {
  await writeFile(join(output, "demo-scroll-results.json"), JSON.stringify(evidence, null, 2));
  await browser.close();
}
assert.deepEqual(failures, [], "Every viewport and demo scroll contract must pass");
