import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { binary, runtimeRoot } from "./install-nona-local.mjs";
import { runtimeEnvironment } from "./nona-local-runtime.mjs";

const child = spawn(binary, ["serve"], {
  cwd: runtimeRoot,
  env: runtimeEnvironment(),
  windowsHide: true,
  stdio: ["ignore", "inherit", "inherit"],
});
child.once("error", (error) => {
  console.error(error.code);
  process.exitCode = 1;
});
child.once("spawn", async () => {
  await writeFile(resolve(runtimeRoot, "server.json"), JSON.stringify({ pid: child.pid, binary }));
});
child.once("exit", (code) => {
  process.exitCode = code || 0;
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill());
