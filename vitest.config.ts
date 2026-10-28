import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { nodeTestFiles } from "./scripts/run-node-tests.mjs";

// Unit tests do not start the app, cloud plugins, server transforms or previews.
// Native node:test suites run separately through the same npm test command.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    exclude: [...configDefaults.exclude, ...nodeTestFiles()],
    maxWorkers: 4,
  },
});
