import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const share = JSON.parse(
  await readFile(resolve(root, "../nona-private/design-preview.json"), "utf8"),
);
const origin = new URL(share.guide).origin;
const { chromium } = createRequire(resolve(root, "../tools/package.json"))("playwright");
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--disable-background-networking", "--no-first-run", "--disable-gpu"],
});
const errors = [],
  blocked = [];
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    blocked.push(new URL(route.request().url()).origin);
    return route.abort();
  });
  await page.goto(share.guide);
  await page.locator(".hb-section-card").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator(".nona-property-heading h1").innerText(), "Villa Mare");
  assert.equal(
    await page
      .locator(".nona-property-heading h1")
      .evaluate((item) => getComputedStyle(item).color),
    "rgb(120, 14, 47)",
  );
  await page.screenshot({
    path: resolve(root, "docs/evidence/da/after/lan-guide-390.png"),
    fullPage: true,
  });
  await page.locator(".nona-launcher").click();
  const message = "Nona, comment je me connecte au Wi-Fi ?";
  await page.locator(".nona-composer textarea").fill(message);
  const reply = page.waitForResponse((response) => response.url() === origin + "/chat", {
    timeout: 135000,
  });
  await page.locator(".nona-composer button[type=submit]").click();
  const response = await reply;
  assert.equal(response.status(), 200);
  const turn = await response.json();
  assert.equal(turn.provider, "ollama-local");
  assert.equal(turn.mode, "ai");
  assert.equal(turn.usage.estimatedCostMicros, 0);
  await page.getByText(turn.text, { exact: true }).waitFor();
  await page.screenshot({ path: resolve(root, "docs/evidence/da/after/lan-chat-ai-390.png") });
  assert.deepEqual(errors, []);
  assert.deepEqual(blocked, []);
  const evidence = {
    checkedAt: new Date().toISOString(),
    scope: "Chrome at 390x844 through the PC's authenticated LAN endpoint, not a physical phone",
    officialPalette: true,
    realLocalInference: true,
    provider: turn.provider,
    modelCalls: turn.usage.modelCalls,
    paidCostMicros: 0,
    externalBrowserRequests: 0,
    pageErrors: errors,
    passed: true,
  };
  await writeFile(
    resolve(root, "docs/evidence/nona-da-phone-browser-20261017.json"),
    JSON.stringify(evidence, null, 2),
  );
  console.log(JSON.stringify(evidence));
} catch (error) {
  console.error(JSON.stringify({ pageErrors: errors, blocked }));
  throw error;
} finally {
  await browser.close();
}
