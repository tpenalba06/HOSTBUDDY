import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// A hidden, detached launcher owns this process. It survives the tool session;
// restart only the local server, never a request or a billable inference.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
let stopping = false;
let child;
let failures = 0;
function start() {
  let portInUse = false;
  const started = Date.now();
  child = spawn(process.execPath, ["scripts/validation/nona-ai-lab.mjs"], {
    cwd: root,
    windowsHide: true,
    stdio: ["ignore", "inherit", "pipe"],
  });
  child.stderr.on("data", (data) => {
    if (data.toString().includes("EADDRINUSE")) portInUse = true;
    process.stderr.write(data);
  });
  child.on("error", () => {
    console.error("NONA: impossible de lancer le serveur local.");
  });
  child.on("exit", (code) => {
    if (stopping || portInUse || code === 0) return;
    failures = Date.now() - started > 60000 ? 0 : failures + 1;
    if (failures >= 5) {
      console.error("NONA: arrêt après cinq échecs de démarrage. Aucun appel IA effectué.");
      return;
    }
    console.log(`NONA: serveur arrêté (${code}), redémarrage local.`);
    setTimeout(start, Math.min(15000, 1000 * 2 ** failures));
  });
}
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    stopping = true;
    child?.kill();
  });
}
start();
