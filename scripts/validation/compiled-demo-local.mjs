import { createServer } from "node:http";
import { readFile, realpath } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

// Read-only compiled demo, with fictitious build configuration. No accounts,
// remote database, cloud inference, Stripe, server functions or deployment.
const root = fileURLToPath(new URL("../../", import.meta.url));
const publicRoot = await realpath(resolve(root, ".output/public"));
globalThis.fetch = async () => {
  throw new Error("external_network_disabled_for_local_demo");
};
for (const name of [
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "AI_GATEWAY_API_KEY",
  "NONA_AI_ENABLE",
])
  delete process.env[name];
process.env.SUPABASE_URL = "https://nona-demo.invalid";
const worker = (await import("../../.output/server/index.mjs")).default;
const mime = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
};
const port = 4183;
createServer(async (request, response) => {
  response.setHeader("cache-control", "no-store");
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader(
    "content-security-policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; worker-src 'self' blob:; form-action 'self'; base-uri 'self'; frame-ancestors 'none'",
  );
  if (request.headers.host !== `127.0.0.1:${port}` || request.method !== "GET") {
    response.writeHead(403);
    return response.end();
  }
  try {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    if (url.pathname === "/design-review") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return response.end(await readFile(resolve(root, "docs/evidence/da/review.html")));
    }
    if (url.pathname === "/design-phone-qr.svg") {
      const share = JSON.parse(
        await readFile(resolve(root, "../nona-private/design-preview.json"), "utf8"),
      );
      if (Date.parse(share.expiresAt) <= Date.now()) throw new Error("share_expired");
      response.writeHead(200, { "content-type": "image/svg+xml" });
      return response.end(
        await QRCode.toString(share.guide, {
          type: "svg",
          margin: 4,
          color: { dark: "#780e2f", light: "#fcf9f2" },
        }),
      );
    }
    if (url.pathname.startsWith("/design-evidence/")) {
      const base = await realpath(resolve(root, "docs/evidence/da"));
      const path = await realpath(
        resolve(base, decodeURIComponent(url.pathname.slice("/design-evidence/".length))),
      );
      if (!path.startsWith(base + sep) || extname(path) !== ".png")
        throw new Error("invalid_evidence_path");
      response.writeHead(200, { "content-type": "image/png" });
      return response.end(await readFile(path));
    }
    if (["/", "/demo", "/auth"].includes(url.pathname)) {
      const result = await worker.fetch(new Request(url), {}, { waitUntil() {} });
      response.writeHead(result.status, { "content-type": "text/html; charset=utf-8" });
      return response.end(await result.text());
    }
    const relative = decodeURIComponent(url.pathname).slice(1);
    if (relative.includes(":")) throw new Error("invalid_path");
    const path = await realpath(resolve(publicRoot, relative));
    if (!path.startsWith(publicRoot + sep) || !mime[extname(path)]) throw new Error("invalid_path");
    const bytes = await readFile(path);
    response.writeHead(200, { "content-type": mime[extname(path)] });
    response.end(bytes);
  } catch {
    response.writeHead(404);
    response.end();
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`Compiled NONA local demo: http://127.0.0.1:${port}/demo`),
);
