import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { binary, runtimeRoot } from "./install-nona-local.mjs";
import { localModel, localOrigin } from "./nona-local-runtime.mjs";

try {
  const root = "http://127.0.0.1:4182";
  const page = await fetch(root, { signal: AbortSignal.timeout(2000) });
  if ((await page.text()).includes('data-local="true"')) {
    const cookie = page.headers.get("set-cookie")?.split(";")[0];
    const stopped = await fetch(root + "/stop", {
      method: "POST",
      headers: { cookie, origin: root },
      signal: AbortSignal.timeout(5000),
    });
    if (stopped.status === 409)
      throw new Error("Une réponse est en cours. Attends sa fin avant de fermer NONA.");
  }
} catch (error) {
  if (error.message.startsWith("Une réponse")) {
    console.error(error.message);
    process.exit(1);
  }
}
try {
  // Empty prompt + keep_alive=0 unloads, without generating a reply.
  await fetch(localOrigin + "/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: localModel, keep_alive: 0 }),
    signal: AbortSignal.timeout(10000),
    redirect: "error",
  });
} catch {
  /* already closed */
}
try {
  const state = JSON.parse(await readFile(resolve(runtimeRoot, "server.json"), "utf8"));
  if (state.binary !== binary || !Number.isSafeInteger(state.pid) || state.pid < 1)
    throw new Error("Etat inconnu.");
  // Verify exact executable before stopping this installation's own process.
  const script =
    "$p = Get-Process -Id " +
    state.pid +
    ' -ErrorAction Stop; if ($p.Path -ne $env:NONA_OWN_BINARY) { throw "Processus different" }; Stop-Process -Id $p.Id -ErrorAction Stop';
  await promisify(execFile)(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    {
      env: { ...process.env, NONA_OWN_BINARY: binary },
      windowsHide: true,
    },
  );
} catch {
  /* Never stop an unrecognised or already stopped process. */
}
console.log("Laboratoire local ferme et modele decharge de la memoire video.");
