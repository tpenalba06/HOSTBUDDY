import { build } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Local QA of the actual shared guide and compiled concierge endpoint.
// Synthetic Villa Mare only. No credentials, model, Supabase or deployment.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ui = resolve(root, ".output/cloud-preview-source");
const dist = resolve(root, ".output/cloud-preview");
await mkdir(ui, { recursive: true });
let entry = await readFile(resolve(root, "scripts/validation/nona-local-ui/entry.tsx"), "utf8");
entry = entry.replace('JSON.stringify({ ...request, mode: "local" })', "JSON.stringify(request)");
entry = entry.replace(
  "{nonaVisualCopy(locale).local}",
  "Recette cloud NONA : données fictives, repli guidé actif, aucun appel IA ni paiement réel.",
);
entry = entry.replace('import { nonaVisualCopy } from "@/lib/nona-visual-copy";', "");
await writeFile(resolve(ui, "entry.tsx"), entry);
await writeFile(
  resolve(ui, "index.html"),
  '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>NONA — recette cloud sans dépense</title></head><body><div id="root"></div><script type="module" src="./entry.tsx"></script></body></html>',
);
const fixtureEntry = resolve(ui, "backend.ts");
await writeFile(
  fixtureEntry,
  'export { localGuide } from "../../scripts/validation/nona-local-fixture";',
);
await build({
  configFile: false,
  root,
  logLevel: "error",
  publicDir: false,
  resolve: { alias: { "@": resolve(root, "src") } },
  build: {
    ssr: fixtureEntry,
    target: "node22",
    outDir: resolve(dist, "backend"),
    emptyOutDir: true,
  },
});
await build({
  configFile: false,
  root: ui,
  logLevel: "error",
  publicDir: false,
  base: "/nona-ui/",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": resolve(root, "src") } },
  build: { outDir: resolve(dist, "interface"), emptyOutDir: true },
});
const { localGuide } = await import("../../.output/cloud-preview/backend/backend.js");
delete process.env.NONA_CLOUD_ENABLE;
delete process.env.AI_GATEWAY_API_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.SUPABASE_URL = "https://nona-demo.invalid";
process.env.SUPABASE_PUBLISHABLE_KEY = "SYNTHETIC_PUBLIC_KEY";
globalThis.fetch = async (url) => {
  if (String(url) !== "https://nona-demo.invalid/rest/v1/rpc/get_public_guide")
    throw new Error("external-network-disabled");
  return Response.json(localGuide());
};
const { conciergeResponse } = await import("../../.output/nona-cloud-server/concierge.server.js");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
};
const origin = "http://127.0.0.1:4196";
createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const url = new URL(req.url, origin);
    if (req.method === "GET" && url.pathname === "/local-guide") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(localGuide(url.searchParams.get("locale") || "fr")));
      return;
    }
    if (req.method === "POST" && url.pathname === "/chat") {
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 12288) {
          res.writeHead(413);
          res.end();
          return;
        }
        chunks.push(chunk);
      }
      const result = await conciergeResponse(
        new Request(origin + "/api/public/concierge", {
          method: "POST",
          headers: req.headers,
          body: Buffer.concat(chunks),
        }),
      );
      res.writeHead(result.status, Object.fromEntries(result.headers));
      res.end(Buffer.from(await result.arrayBuffer()));
      return;
    }
    if (req.method !== "GET") {
      res.writeHead(405);
      res.end();
      return;
    }
    const base =
      url.pathname.startsWith("/nona-ui/") || url.pathname === "/"
        ? resolve(dist, "interface")
        : resolve(root, "public");
    const relative =
      url.pathname === "/"
        ? "index.html"
        : decodeURIComponent(url.pathname.replace(/^\/nona-ui\//, "").replace(/^\//, ""));
    const path = resolve(base, relative);
    if (!path.startsWith(base + sep) || relative.includes(":")) {
      res.writeHead(404);
      res.end();
      return;
    }
    const type = mime[extname(path)];
    if (!type) {
      res.writeHead(404);
      res.end();
      return;
    }
    const body = await readFile(path);
    res.setHeader("Content-Type", type);
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(4196, "127.0.0.1", () =>
  console.log("NONA_CLOUD_PREVIEW " + origin + " (guided fallback; no inference)"),
);
