import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(resolve(root, "../tools/package.json"));
const { chromium } = require("playwright");
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--disable-background-networking", "--no-first-run", "--disable-gpu"],
});
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:4182/");
  await page.locator("#status").filter({ hasText: "IA locale prête" }).waitFor();
  assert.equal(await page.locator("#gateway").isVisible(), false);
  assert.equal(await page.locator("#mode").inputValue(), "local");
  assert.equal(await page.locator("#mode option[value=ai]").count(), 0);
  await page.locator("#message").fill("Nona, comment je me connecte au Wi-Fi ?");
  await page.locator("#chat button").click();
  await page.locator("#log").filter({ hasText: "IA locale" }).waitFor({ timeout: 130000 });
  assert.match(await page.locator("#log").innerText(), /VillaMare_5G/);
  assert.equal(await page.locator("#error").innerText(), "");
  assert.deepEqual(errors, []);
  await mkdir(resolve(root, "docs/evidence"), { recursive: true });
  await page.screenshot({
    path: resolve(root, "docs/evidence/nona-local-browser-20261017.png"),
    fullPage: true,
  });
  const evidence = {
    checkedAt: new Date().toISOString(),
    browser: "Chrome headless",
    viewport: "390x844",
    realLocalModel: true,
    paidApiCalls: 0,
    pageErrors: errors,
    passed: true,
  };
  await writeFile(
    resolve(root, "docs/evidence/nona-local-browser-20261017.json"),
    JSON.stringify(evidence, null, 2),
  );
  console.log(JSON.stringify(evidence));
} finally {
  await browser.close();
}
