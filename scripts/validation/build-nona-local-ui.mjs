import { build } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export async function buildLocalUi() {
  // Separate client build: never loads the full app config or its cloud plugins,
  // credentials, server routes or Supabase fallback.
  await build({
    configFile: false,
    logLevel: "warn",
    root: resolve(root, "scripts/validation/nona-local-ui"),
    publicDir: false,
    base: "/nona-ui/",
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": resolve(root, "src") } },
    build: {
      outDir: resolve(root, "../nona-local-runtime/interface"),
      emptyOutDir: true,
    },
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await buildLocalUi();
