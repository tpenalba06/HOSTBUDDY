// Public local demo only. No live accounts, payment, mail or production mutation.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const { chromium } = await import(process.env.HOSTBUDDY_PLAYWRIGHT_MODULE || "playwright-core");
const browser = await chromium.launch({ headless: true });
const origin = process.env.HOSTBUDDY_TEST_ORIGIN || "http://127.0.0.1:5173";
const evidence = [];
try {
  for (const width of [360, 390, 430, 768, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      hasTouch: width < 500,
      isMobile: width < 500,
      locale: "fr-FR",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(origin + "/demo");
    await page.waitForLoadState("networkidle");
    const demo = page.locator(".demo-container");
    await demo.getByRole("tab").nth(1).click();
    await demo.getByRole("button", { name: "Modifier Villa Mare", exact: true }).click();
    const rail = page.locator(".section-organizer");
    await rail.waitFor();
    await page.waitForFunction(
      () => getComputedStyle(document.querySelector(".section-drag-handle")).touchAction === "none",
    );
    const order = () =>
      rail.locator("[data-section-id]").evaluateAll((rows) => rows.map((r) => r.dataset.sectionId));
    const initial = await order();
    assert(initial.length >= 3);
    const first = rail.locator(".section-drag-handle").nth(0);
    const third = rail.locator(".section-drag-handle").nth(2);
    await third.scrollIntoViewIfNeeded();
    await first.scrollIntoViewIfNeeded();
    const from = await first.boundingBox(),
      to = await third.boundingBox();
    assert(from && to);
    if (width < 500) {
      const cdp = await context.newCDPSession(page);
      const touch = (type, x, y) =>
        cdp.send("Input.dispatchTouchEvent", {
          type,
          touchPoints: type === "touchEnd" ? [] : [{ x, y }],
        });
      const x = from.x + from.width / 2,
        y = from.y + from.height / 2;
      await touch("touchStart", x, y);
      for (let i = 1; i <= 12; i++) {
        await touch("touchMove", x, y + ((to.y + to.height / 2 - y) * i) / 12);
        await page.waitForTimeout(30);
      }
      await touch("touchEnd");
    } else {
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 16 });
      await page.mouse.up();
    }
    const expected = [...initial];
    expected.splice(2, 0, expected.splice(0, 1)[0]);
    await page.waitForFunction(
      (expected) =>
        JSON.stringify(
          [...document.querySelectorAll(".section-organizer [data-section-id]")].map(
            (r) => r.dataset.sectionId,
          ),
        ) === JSON.stringify(expected),
      expected,
    );
    assert.deepEqual(await order(), expected);
    const titles = await rail.locator(".section-select").allTextContents();
    // Same local data and renderer feed the traveler after manager edits.
    await demo.getByRole("tab").nth(0).click();
    const guestTitles = await demo
      .locator(".hb-section-grid .hb-section-card-label")
      .allTextContents();
    assert(guestTitles.length > 0, "Traveler cards must render");
    assert.deepEqual(
      guestTitles.map((t) => t.trim()),
      titles.map((t) => t.trim()),
      "Traveler must follow manager order",
    );
    // No video fixture: no empty placeholder or video control.
    assert.equal(await demo.locator("[data-presentation-video]").count(), 0);
    await demo.getByRole("tab").nth(1).click();
    assert.deepEqual(await order(), expected);
    // The demo persists plain section data in sessionStorage; no media blob is involved yet.
    await page.reload();
    await page.waitForLoadState("networkidle");
    await demo.getByRole("tab").nth(1).click();
    await demo.getByRole("button", { name: "Modifier Villa Mare", exact: true }).click();
    await rail.waitFor();
    assert.deepEqual(await order(), expected);
    // Keyboard drag moves one position; Escape and accessible fallback are separate controls.
    const handle = rail.locator(".section-drag-handle").first();
    await handle.focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");
    const keyboardExpected = [...expected];
    [keyboardExpected[0], keyboardExpected[1]] = [keyboardExpected[1], keyboardExpected[0]];
    await page.waitForFunction(
      (expected) =>
        JSON.stringify(
          [...document.querySelectorAll(".section-organizer [data-section-id]")].map(
            (r) => r.dataset.sectionId,
          ),
        ) === JSON.stringify(expected),
      keyboardExpected,
    );
    await rail.locator(".section-menu").first().click();
    await page.getByRole("menuitem", { name: "Descendre" }).click();
    assert.deepEqual(await order(), expected);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
      false,
    );
    await page.screenshot({ path: `/tmp/hb-editor-${width}.png`, fullPage: true });
    // Actual browser metadata checks, including portrait playback aspect ratio.
    if (width === 390 || width === 1440) {
      await page
        .locator(".guide-editor-rail")
        .getByRole("button", { name: "Général", exact: true })
        .click();
      for (const [name, size] of [
        ["landscape", "320x180"],
        ["portrait", "180x320"],
      ]) {
        const file = `/tmp/hb-intro-${name}.mp4`;
        execFileSync(
          "ffmpeg",
          [
            "-y",
            "-f",
            "lavfi",
            "-i",
            `color=c=0x7a8f7b:s=${size}:d=2`,
            "-f",
            "lavfi",
            "-i",
            "anullsrc=r=44100:cl=stereo",
            "-shortest",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-movflags",
            "+faststart",
            file,
          ],
          { stdio: "ignore" },
        );
        await page.locator(".presentation-video-editor input[type=file]").setInputFiles(file);
        await page.waitForFunction(
          () => {
            const player = document.querySelector(".presentation-video-editor video");
            return (
              player &&
              player.readyState >= 1 &&
              !document.querySelector(".presentation-video-editor input")?.disabled
            );
          },
          undefined,
          { timeout: 120000 },
        );
        await demo.getByRole("tab").nth(0).click();
        const video = demo.locator("[data-presentation-video] video");
        await video.waitFor();
        await page.waitForFunction(
          () => document.querySelector("[data-presentation-video] video")?.readyState >= 1,
        );
        assert.equal(
          await video.evaluate((v) => v.videoWidth > v.videoHeight),
          name === "landscape",
        );
        assert.equal(await video.evaluate((v) => v.autoplay), false);
        assert.equal(await video.evaluate((v) => v.playsInline), true);
        assert(await video.evaluate((v) => v.getBoundingClientRect().height <= innerHeight * 0.71));
        assert(
          await page.evaluate(() => {
            const intro = document.querySelector("[data-presentation-video]"),
              services = document.querySelector(".hb-services-feature");
            return (
              intro &&
              services &&
              !!(intro.compareDocumentPosition(services) & Node.DOCUMENT_POSITION_FOLLOWING)
            );
          }),
        );
        await page.screenshot({ path: `/tmp/hb-intro-${name}-${width}.png`, fullPage: true });
        await demo.getByRole("tab").nth(1).click();
      }
      await page
        .locator(".presentation-video-editor")
        .getByRole("button", { name: "Supprimer", exact: true })
        .click();
      await demo.getByRole("tab").nth(0).click();
      await page.waitForFunction(() => !document.querySelector("[data-presentation-video]"));
    }
    assert.deepEqual(errors, []);
    evidence.push({
      width,
      input: width < 500 ? "touch" : "mouse",
      initial,
      final: expected,
      titles,
      guestTitles,
      keyboard: true,
      fallback: true,
      video: width === 390 || width === 1440,
    });
    await context.close();
  }
} finally {
  await writeFile("/tmp/hb-editor-evidence.json", JSON.stringify(evidence, null, 2));
  await browser.close();
}
console.log(JSON.stringify(evidence, null, 2));
