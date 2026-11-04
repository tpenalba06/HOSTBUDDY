import { build } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Pure local compilation. Does not load vite.config.ts, its hosting wrapper,
// credentials, vendor integrations, deployment hooks or application services.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
await build({
  configFile: false,
  root,
  logLevel: "warn",
  publicDir: false,
  resolve: { alias: { "@": resolve(root, "src") } },
  build: {
    ssr: "src/lib/concierge.server.ts",
    target: "node22",
    outDir: resolve(root, ".output/nona-cloud-server"),
    emptyOutDir: true,
  },
});
await build({
  configFile: false,
  root: resolve(root, "scripts/validation/nona-local-ui"),
  logLevel: "warn",
  publicDir: false,
  base: "/nona-ui/",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": resolve(root, "src") } },
  build: { outDir: resolve(root, "../nona-cloud-runtime/interface"), emptyOutDir: true },
});
console.log("NONA_ISOLATED_SERVER_AND_SHARED_CHAT_BUILD_OK");
