import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
import worker from "../../.output/server/index.mjs";

// Exercise the compiled SSR entry, not source snippets or a development server.
const response = await worker.fetch(new Request("https://localhost/"), {}, { waitUntil() {} });
assert.equal(response.status, 200);
const html = await response.text();
const hero = [...html.matchAll(/<img\b[^>]*>/g)]
  .map((match) => match[0])
  .find((tag) => tag.includes("hostbuddy-arrival.jpg"));
assert.ok(hero?.includes('fetchPriority="high"') || hero?.includes('fetchpriority="high"'));
const assets = JSON.parse(readFileSync(".output/public/offline-assets.json", "utf8")).assets;
const fonts = assets.filter((path) => path.startsWith("/guide-fonts/") && path.endsWith(".woff2"));
assert.equal(fonts.length, 3);
assert.equal(assets.filter((path) => path.endsWith(".ttf")).length, 0);
const css = readdirSync(".output/public/assets")
  .filter((name) => name.endsWith(".css"))
  .map((name) => readFileSync(`.output/public/assets/${name}`, "utf8"))
  .join("\n");
for (const font of fonts) assert.ok(css.includes(font));
assert.ok(!css.includes('.ttf"'));
console.log(
  JSON.stringify({
    scope: "compiled-homepage-SSR-and-offline-fonts",
    status: response.status,
    heroPriority: "high",
    woff2Faces: fonts.length,
    duplicateTTFDownloads: 0,
  }),
);
