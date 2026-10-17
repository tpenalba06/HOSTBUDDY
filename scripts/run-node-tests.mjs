import { readdirSync, readFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
export function nodeTestFiles() {
  const found = [];
  function visit(folder) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = resolve(folder, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (
        entry.name.endsWith(".test.mjs") &&
        /from\s+["']node:test["']/.test(readFileSync(path, "utf8"))
      )
        found.push(relative(root, path).replaceAll("\\", "/"));
    }
  }
  for (const directory of ["src", "scripts", "build"]) visit(resolve(root, directory));
  return found.sort();
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const tests = nodeTestFiles();
  if (!tests.length) throw new Error("node_test_inventory_empty");
  const result = spawnSync(process.execPath, ["--test", "--test-concurrency=4", ...tests], {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
