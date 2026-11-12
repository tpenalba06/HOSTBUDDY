import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readVaultState } from "./nona-lab-vault.mjs";
import { inspectLedger } from "./nona-ledger-diagnostic.mjs";
import { probe, networkFailure, localLabStatus } from "./nona-network-probes.mjs";

// User-launched, read-only diagnostic. No model, reservation RPC or SQL mutation.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const folder = resolve(root, "../nona-private");
try {
  const workMode = process.argv.includes("--work");
  const network = await Promise.all([
    probe("ai-gateway.vercel.sh", "/v1/models"),
    probe("mhhtnqfdkyudwyqlmnce.supabase.co", "/auth/v1/health"),
  ]);
  const vault = workMode
    ? { state: "not-read-in-network-only-mode", value: null }
    : await readVaultState(resolve(folder, "credentials.dpapi"));
  let gateway = { authenticated: false, reason: "vault-not-read-or-unavailable" };
  if (vault.value) {
    try {
      const response = await fetch("https://ai-gateway.vercel.sh/v1/credits", {
        headers: { Authorization: `Bearer ${vault.value.gateway}` },
        redirect: "error",
        signal: AbortSignal.timeout(7000),
      });
      gateway = { authenticated: response.ok, status: response.status };
      await response.body?.cancel();
    } catch (error) {
      gateway = { authenticated: false, ...networkFailure(error) };
    }
  }
  const report = {
    checkedAt: new Date().toISOString(),
    context: workMode ? "work-execution" : "windows-launcher",
    project: "mhhtnqfdkyudwyqlmnce",
    network,
    localServer: workMode ? { checked: false } : await localLabStatus(),
    gateway,
    proxyEnvironmentPresent: Boolean(
      process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY,
    ),
    vault: vault.state,
    inferenceCalls: 0,
    ledger: workMode
      ? { checked: false }
      : vault.value
        ? await inspectLedger(vault.value)
        : { ok: false, reason: "vault-unavailable" },
  };
  await mkdir(folder, { recursive: true });
  await writeFile(
    resolve(folder, workMode ? "network-work.json" : "access-diagnostic.json"),
    JSON.stringify(report, null, 2),
    {
      mode: 0o600,
    },
  );
  console.log("Diagnostic termine et enregistre sans aucune cle.");
  for (const target of network)
    console.log(
      `${target.host} : DNS ${target.dns.ok ? "OK" : target.dns.code}; HTTPS ${target.https.reachable ? target.https.status : target.https.code}`,
    );
  if (!workMode) {
    console.log("Gateway authentifie : " + gateway.authenticated);
    console.log("Registre TEST : " + (report.ledger.ok ? "accessible" : report.ledger.reason));
    console.log(
      "Serveur local NONA : " +
        (report.localServer.reachable ? report.localServer.status : report.localServer.code),
    );
  }
  console.log("Aucun appel IA. Reviens dans Work et indique : diagnostic termine.");
} catch {
  console.error("Le diagnostic n'a pas pu etre enregistre. Aucune cle n'a ete affichee.");
  process.exitCode = 1;
}
