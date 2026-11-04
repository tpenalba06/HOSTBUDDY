import { execFileSync } from "node:child_process";
import { readFile, writeFile, copyFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { assertPublicEnvironment } from "../../build/public-config.mjs";
import { TEST_BACKEND } from "./manager-test-boundary.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
if (
  process.env.VERCEL_ENV === "production" ||
  process.env.VITE_SUPABASE_URL !== TEST_BACKEND ||
  process.env.VITE_SUPABASE_PROJECT_ID !== "mhhtnqfdkyudwyqlmnce" ||
  !process.env.VITE_SUPABASE_PUBLISHABLE_KEY
)
  throw new Error("isolated_TEST_build_required");
assertPublicEnvironment(process.env);
const env = { ...process.env, NITRO_PRESET: "vercel" };
for (const name of Object.keys(env)) {
  if (/STRIPE|OLLAMA|AI_GATEWAY|VERCEL_OIDC_TOKEN|SERVICE_ROLE/.test(name)) delete env[name];
}
execFileSync(process.execPath, ["node_modules/vite/bin/vite.js", "build"], {
  cwd: root,
  env,
  stdio: "inherit",
  windowsHide: true,
});
const fn = resolve(root, ".vercel/output/functions/__server.func");
const config = JSON.parse(await readFile(resolve(fn, ".vc-config.json"), "utf8"));
if (config.handler !== "index.mjs" || !config.runtime.startsWith("nodejs"))
  throw new Error("unexpected_TEST_function_shape");
await copyFile(
  resolve(root, "scripts/validation/manager-test-boundary.mjs"),
  resolve(fn, "test-boundary.mjs"),
);
await writeFile(
  resolve(fn, "test-entry.mjs"),
  [
    'import { prepareManagerTestEnvironment, managerTestBoundary } from "./test-boundary.mjs";',
    `const ready = prepareManagerTestEnvironment(process.env, ${JSON.stringify(process.env.VITE_SUPABASE_PUBLISHABLE_KEY)});`,
    "let handler;",
    "export default managerTestBoundary(async (req, res) => {",
    '  handler ??= (await import("./index.mjs")).default;',
    "  return handler(req, res);",
    "}, ready);",
  ].join("\n"),
);
config.handler = "test-entry.mjs";
await writeFile(resolve(fn, ".vc-config.json"), JSON.stringify(config, null, 2));
console.log("ISOLATED_MANAGER_TEST_BUILD_READY_NO_MODEL_OR_PAYMENTS");
