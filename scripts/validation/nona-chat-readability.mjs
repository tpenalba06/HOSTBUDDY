import { createRequire } from "node:module";
import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const { chromium } = createRequire(resolve("../tools/package.json"))("playwright");
const origin = "http://127.0.0.1:4182";
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--disable-background-networking", "--no-first-run", "--disable-gpu"],
});
const evidence = {
  checkedAt: new Date().toISOString(),
  errors: [],
  externalRequests: [],
  turns: [],
  passed: false,
};
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  });
  page.setDefaultTimeout(20000);
  page.on("pageerror", (error) => evidence.errors.push(error.message));
  await page.route("**/*", (route) => {
    if (new URL(route.request().url()).origin !== origin) {
      evidence.externalRequests.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await page.goto(origin + "/nona");
  await page.locator(".nona-launcher").click();
  const panel = await page.locator(".nona-panel").boundingBox();
  const viewport = await page.locator(".nona-content").boundingBox();
  const composer = await page.locator(".nona-composer").boundingBox();
  assert.equal(panel.width, 390);
  assert.equal(panel.height, 844);
  assert.ok(viewport.height >= 600, JSON.stringify(viewport));
  assert.ok(composer.height <= 90, JSON.stringify(composer));
  evidence.mobile = { panel, viewport, composer };
  for (const message of [
    "Je voudrais un petit-déjeuner",
    "Merci, et comment je me connecte au Wi-Fi ?",
  ]) {
    await page.locator(".nona-composer textarea").fill(message);
    const pending = page.waitForResponse(
      (r) => r.url() === origin + "/chat" && r.request().postDataJSON().message === message,
      { timeout: 130000 },
    );
    await page.locator(".nona-composer button[type=submit]").click();
    const user = page.locator(".nona-user").last();
    await user.filter({ hasText: message }).waitFor();
    const userBounds = await user.boundingBox();
    assert.ok(
      userBounds.y >= viewport.y - 1 &&
        userBounds.y + userBounds.height <= viewport.y + viewport.height + 1,
      "typed message hidden",
    );
    const response = await pending;
    const turn = await response.json();
    assert.equal(response.status(), 200, JSON.stringify(turn));
    assert.equal(turn.provider, "ollama-local");
    assert.equal(turn.usage.estimatedCostMicros, 0);
    await page.getByText(turn.text, { exact: true }).first().waitFor();
    // Allow the post-render scroll effect to align the new answer.
    await page.waitForFunction(() => {
      const c = document.querySelector(".nona-content").getBoundingClientRect();
      const m = [...document.querySelectorAll("[data-message-id]")].at(-1).getBoundingClientRect();
      return m.top >= c.top - 1 && m.top < c.bottom - 40;
    });
    evidence.turns.push({ message, text: turn.text, provider: turn.provider, visible: true });
  }
  assert.equal(await page.locator(".nona-service-card").count(), 1);
  assert.ok(
    await page.evaluate(() => {
      const card = document.querySelector(".nona-service-card");
      const user = [...document.querySelectorAll(".nona-user")].at(-1);
      return Boolean(card.compareDocumentPosition(user) & Node.DOCUMENT_POSITION_FOLLOWING);
    }),
  );
  await page.screenshot({ path: "docs/evidence/nona-chat-readable-mobile-20261017.png" });
  await page.setViewportSize({ width: 1280, height: 900 });
  const desktopPanel = await page.locator(".nona-panel").boundingBox();
  assert.equal(desktopPanel.width, 520);
  assert.ok(desktopPanel.height >= 760);
  evidence.desktop = {
    panel: desktopPanel,
    viewport: await page.locator(".nona-content").boundingBox(),
  };
  await page.screenshot({ path: "docs/evidence/nona-chat-readable-desktop-20261017.png" });
  assert.deepEqual(evidence.errors, []);
  assert.deepEqual(evidence.externalRequests, []);
  evidence.passed = true;
} finally {
  await browser.close();
  await writeFile(
    "docs/evidence/nona-chat-readability-20261017.json",
    JSON.stringify(evidence, null, 2),
  );
}
console.log(JSON.stringify(evidence));
