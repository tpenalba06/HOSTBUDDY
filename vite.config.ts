// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { mediaOfflinePlugin } from "./build/media-offline-plugin";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { assertPublicEnvironment } from "./build/public-config.mjs";

assertPublicEnvironment(process.env);

// Public (publishable) backend config. Fallback so published builds work even when
// the untracked .env file is not present at build time. Never put secret keys here.
const PUBLIC_SUPABASE_URL =
  process.env["VITE_SUPABASE_URL"] || "https://jzbjpaucgckggumhowns.supabase.co";
const PUBLIC_SUPABASE_KEY =
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || "sb_publishable_sZbK5zbP8dzTY5oot34arQ_b2bhpQk6";
const PUBLIC_SUPABASE_PROJECT_ID =
  process.env["VITE_SUPABASE_PROJECT_ID"] || "jzbjpaucgckggumhowns";

export default defineConfig({
  vite: {
    plugins: [
      mediaOfflinePlugin(),
      {
        name: "hostbuddy-public-configuration-guard",
        configResolved(config) {
          assertPublicEnvironment(config.env);
        },
      },
    ],
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(PUBLIC_SUPABASE_URL),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(PUBLIC_SUPABASE_KEY),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(PUBLIC_SUPABASE_PROJECT_ID),
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
