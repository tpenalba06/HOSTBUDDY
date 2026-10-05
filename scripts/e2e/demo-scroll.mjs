// Run with a local dev/preview server and Playwright Chromium installed.
// HOSTBUDDY_PLAYWRIGHT_MODULE may point to the runtime's playwright-core module.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import process from "node:process";
const { chromium } = await import(process.env.HOSTBUDDY_PLAYWRIGHT_MODULE || "playwright-core");
const browser = await chromium.launch({
  headless: true,
  ...(process.env.HOSTBUDDY_CHROMIUM ? { executablePath: process.env.HOSTBUDDY_CHROMIUM } : {}),
});
const origin = process.env.HOSTBUDDY_TEST_ORIGIN || "http://127.0.0.1:5173";
const evidence = [];
const boundaryFailures = [];
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
      await demo.waitFor({ state: "visible" });
      // Vite serves CSS asynchronously on a cold start; test only the rendered layout.
      await page.waitForFunction(() => {
        const viewport = document.querySelector(".demo-viewport");
        return (
          viewport && getComputedStyle(viewport).height !== "auto" && viewport.clientHeight >= 420
        );
      });
      await page.waitForLoadState("networkidle");
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
        await owner.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
        await page.waitForTimeout(150);
        const state = await owner.evaluate((el) => ({
          h: el.clientHeight,
          sh: el.scrollHeight,
          overflow: getComputedStyle(el).overflowY,
          chain: getComputedStyle(el).overscrollBehaviorY,
        }));
        console.error(JSON.stringify({ stage: "layout", route, mode, width, state }));
        assert.equal(state.overflow, "auto");
        assert.equal(state.chain, "auto");
        assert.ok(state.h > 0 && state.sh > state.h, `scrollable ${route} ${mode} ${width}`);
        await owner.evaluate((el) => {
          el.scrollTop = 0;
        });
        const box = await owner.boundingBox();
        const x = box.x + box.width / 2,
          y = Math.min(height - 110, Math.max(150, box.y + 100));
        console.error(
          JSON.stringify({
            route,
            mode,
            width,
            state,
            box,
            x,
            y,
            hit: await page.evaluate(
              ({ x, y }) => ({
                tag: document.elementFromPoint(x, y)?.tagName,
                classes: document.elementFromPoint(x, y)?.className,
                inside: !!document.elementFromPoint(x, y)?.closest(".demo-viewport"),
                sy: scrollY,
              }),
              { x, y },
            ),
          }),
        );
        await page.screenshot({
          path:
            (process.env.RUNNER_TEMP || "/tmp") +
            `/hb-scroll-${route === "/" ? "home" : "demo"}-${width}-${mode}.png`,
        });
        await page.mouse.move(x, y);
        await page.mouse.wheel(0, 250);
        await page.waitForTimeout(250);
        console.error(
          JSON.stringify({
            afterWheel: await owner.evaluate((el) => ({ top: el.scrollTop, sy: window.scrollY })),
            route,
            mode,
            width,
          }),
        );
        assert.ok(
          (await owner.evaluate((el) => el.scrollTop)) > 0,
          `internal scroll moves ${route} ${mode} ${width}`,
        );
        if (route === "/") {
          // Reach the boundary with real wheel input, rather than a main-thread
          // scrollTop jump that can race the compositor's wheel target.
          for (let step = 0; step < 32; step++) {
            const atBottom = await owner.evaluate(
              (el) => el.scrollTop >= el.scrollHeight - el.clientHeight - 1,
            );
            if (atBottom) break;
            await page.mouse.wheel(0, 300);
            await page.waitForTimeout(100);
          }
          assert.ok(
            await owner.evaluate((el) => el.scrollTop >= el.scrollHeight - el.clientHeight - 1),
            "reached bottom with wheel",
          );
          // End the previous wheel gesture before starting a new gesture at the boundary.
          // Chromium otherwise keeps its compositor scroll latch on the inner scroller.
          await page.waitForTimeout(400);
          const before = await page.evaluate(() => scrollY);
          await page.mouse.wheel(0, 250);
          await page.waitForTimeout(250);
          console.error(
            JSON.stringify({
              stage: "bottom",
              route,
              mode,
              width,
              before,
              after: await page.evaluate(() => scrollY),
              owner: await owner.evaluate((el) => ({
                top: el.scrollTop,
                max: el.scrollHeight - el.clientHeight,
              })),
              ancestors: await page.evaluate(
                ({ x, y }) => {
                  const result = [];
                  for (let el = document.elementFromPoint(x, y); el; el = el.parentElement) {
                    const css = getComputedStyle(el);
                    result.push({
                      cls: el.className,
                      overflow: css.overflowY,
                      chain: css.overscrollBehaviorY,
                      top: el.scrollTop,
                      height: el.clientHeight,
                      scrollHeight: el.scrollHeight,
                    });
                  }
                  return result;
                },
                { x, y },
              ),
              hit: await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.className, {
                x,
                y,
              }),
            }),
          );
          const chained = (await page.evaluate(() => scrollY)) > before;
          if (!chained) {
            boundaryFailures.push({ route, mode, width, edge: "bottom" });
            await page.waitForTimeout(1000);
            await page.mouse.wheel(0, 250);
            console.error(
              JSON.stringify({
                stage: "boundary-repeat",
                width,
                mode,
                sy: await page.evaluate(() => scrollY),
                top: await owner.evaluate((el) => el.scrollTop),
              }),
            );
            await page.waitForTimeout(300);
            const edgeBox = await owner.boundingBox();
            await page.mouse.move(edgeBox.x + 3, edgeBox.y + 100);
            await page.mouse.wheel(0, 250);
            await page.waitForTimeout(300);
            console.error(
              JSON.stringify({
                stage: "boundary-padding",
                width,
                mode,
                sy: await page.evaluate(() => scrollY),
                top: await owner.evaluate((el) => el.scrollTop),
              }),
            );
            const actualMax = await owner.evaluate((el) => {
              el.scrollTop = 1e7;
              return {
                top: el.scrollTop,
                max: el.scrollHeight - el.clientHeight,
                rect: el.getBoundingClientRect().toJSON(),
                css: getComputedStyle(el).height,
              };
            });
            console.error(JSON.stringify({ stage: "boundary-actual-max", width, mode, actualMax }));
          }
          await owner.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
          await page.waitForTimeout(150);
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
      const demo = page.locator(".demo-container");
      await demo.waitFor({ state: "visible" });
      await page.waitForLoadState("networkidle");
      const cdp = await context.newCDPSession(page);
      for (const mode of ["guest", "manager"]) {
        await demo
          .getByRole("tab")
          .nth(mode === "guest" ? 0 : 1)
          .click();
        const owner = demo.locator(mode === "guest" ? ".demo-viewport" : ".manager-shell-content");
        await owner.evaluate((el) => {
          el.scrollIntoView({ block: "center", behavior: "instant" });
          el.scrollTop = 0;
        });
        const box = await owner.boundingBox();
        const x = Math.round(box.x + box.width / 2),
          y = Math.min(height - 180, Math.round(box.y + 180));
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        for (let i = 1; i <= 10; i++) {
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x, y: y - i * 10 }],
          });
          await page.waitForTimeout(16);
        }
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await page.waitForTimeout(300);
        assert.ok((await owner.evaluate((el) => el.scrollTop)) > 0, `touch swipe scrolls ${mode}`);
        evidence.push({ width, mode, touchPassed: true });
      }
    }
    await context.close();
  }
  console.log(JSON.stringify(evidence, null, 2));
  await writeFile(
    (process.env.RUNNER_TEMP || "/tmp") + "/demo-scroll-results.json",
    JSON.stringify(evidence, null, 2),
  );
  assert.deepEqual(boundaryFailures, [], "Every native boundary gesture must chain");
} finally {
  await browser.close();
}
