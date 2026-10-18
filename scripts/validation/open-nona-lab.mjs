import { spawn } from "node:child_process";
import { mkdir, open } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureLocalModel } from "./nona-local-runtime.mjs";
import { buildLocalUi } from "./build-nona-local-ui.mjs";

// Run by the user from Ouvrir-NONA.cmd. No configuration change or inference.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const url = "http://127.0.0.1:4182/nona";
const logs = resolve(root, "../nona-private");

async function responds() {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    if (!response.ok) return false;
    const html = await response.text();
    return html.includes("NONA") && html.includes('data-nona-local-ui="true"');
  } catch {
    return false;
  }
}

try {
  if (process.platform !== "win32") throw new Error("Ce lanceur demande Windows.");
  await ensureLocalModel();
  await buildLocalUi();
  if (!(await responds())) {
    await mkdir(logs, { recursive: true });
    const out = await open(resolve(logs, "launcher-out.log"), "a");
    const err = await open(resolve(logs, "launcher-error.log"), "a");
    try {
      const child = spawn(process.execPath, ["scripts/validation/nona-ai-lab-supervisor.mjs"], {
        cwd: root,
        env: { ...process.env, NONA_LAB_PROVIDER: "ollama-local-v1" },
        detached: true,
        windowsHide: true,
        stdio: ["ignore", out.fd, err.fd],
      });
      await new Promise((resolve, reject) => {
        child.once("spawn", resolve);
        child.once("error", reject);
      });
      child.unref();
    } finally {
      await out.close();
      await err.close();
    }
    console.log("NONA demarre. Verification du formulaire...");
    let ready = false;
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
      if (await responds()) {
        ready = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
    if (!ready) throw new Error(`Le laboratoire ne repond pas. Journaux : ${logs}`);
  }
  console.log("Formulaire verifie. Ouverture du navigateur. Aucun appel IA effectue.");
  const browser = spawn("rundll32.exe", ["url.dll,FileProtocolHandler", url], {
    detached: true,
    windowsHide: true,
    stdio: "ignore",
  });
  await new Promise((resolve, reject) => {
    browser.once("spawn", resolve);
    browser.once("error", reject);
  });
  browser.unref();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
