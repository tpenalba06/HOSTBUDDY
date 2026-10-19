import { readVaultState } from "./nona-lab-vault.mjs";
import { inspectLedger } from "./nona-ledger-diagnostic.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { conciergeCatalogueAllowed } from "../../src/lib/concierge-cost-guard.server.ts";

// Read-only, no model call, reservation RPC, SQL write, top-up or activation.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const vault = await readVaultState(resolve(root, "../nona-private/credentials.dpapi"));
const report = {
  checkedAt: new Date().toISOString(),
  scope: "isolated-test-read-only",
  vaultState: vault.state,
  model: "anthropic/claude-haiku-5.5",
  inferenceCalls: 0,
  newPayments: 0,
  writesToRemoteDatabase: 0,
  gateway: null,
  ledger: null,
  observationSchemaAvailable: false,
  publishedGuide: false,
  billingControlsVerified: false,
  ready: false,
  blockedReasons: [],
};
const read = async (url, headers = {}) => {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(10000),
    redirect: "error",
    cache: "no-store",
  });
  return { response, data: await response.json() };
};
if (vault.value) {
  const config = vault.value;
  try {
    const [credits, catalogue] = await Promise.all([
      read("https://ai-gateway.vercel.sh/v1/credits", {
        authorization: `Bearer ${config.gateway}`,
      }),
      read("https://ai-gateway.vercel.sh/v1/models"),
    ]);
    const model = catalogue.data.data?.find((m) => m.id === report.model);
    report.gateway = {
      authenticated: credits.response.ok,
      status: credits.response.status,
      balanceUsd: credits.response.ok ? credits.data.balance : null,
      totalUsedUsd: credits.response.ok ? credits.data.total_used : null,
      catalogueAllowed: conciergeCatalogueAllowed(model),
      pricing: model?.pricing ?? null,
    };
    if (!credits.response.ok || !(Number(credits.data.balance) >= 0.0041))
      report.blockedReasons.push(
        "No sufficient prepaid balance demonstrated by the Gateway credits endpoint.",
      );
    if (!report.gateway.catalogueAllowed)
      report.blockedReasons.push("Catalogue price/privacy gate refused the selected model.");
  } catch {
    report.blockedReasons.push("Gateway read-only preflight unavailable.");
  }
  report.ledger = await inspectLedger(config);
  if (
    !report.ledger.ok ||
    !report.ledger.authorization.enabled ||
    Date.parse(report.ledger.authorization.expires_at) <= Date.now()
  )
    report.blockedReasons.push(
      "Existing TEST authorization is disabled, expired or unreadable; not renewed.",
    );
  try {
    const headers = { apikey: config.supabase, authorization: `Bearer ${config.supabase}` };
    const schema = await read(
      "https://mhhtnqfdkyudwyqlmnce.supabase.co/rest/v1/nona_model_observation?select=request_id&limit=0",
      headers,
    );
    report.observationSchemaAvailable = schema.response.ok;
    report.observationSchemaStatus = schema.response.status;
    if (!schema.response.ok)
      report.blockedReasons.push("Prepared observation migration is not available on TEST.");
    const guide = await fetch(
      "https://mhhtnqfdkyudwyqlmnce.supabase.co/rest/v1/rpc/get_public_guide",
      {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ _slug: config.slug }),
        signal: AbortSignal.timeout(10000),
        redirect: "error",
      },
    );
    const data = await guide.json();
    report.publishedGuide = guide.ok && typeof data?.id === "string";
    if (!report.publishedGuide) report.blockedReasons.push("Published TEST guide not readable.");
  } catch {
    report.blockedReasons.push("TEST schema or guide read unavailable.");
  }
} else
  report.blockedReasons.push("Existing encrypted vault unavailable; no key requested or printed.");
report.blockedReasons.push(
  "Auto top-up, BYOK, chargeable extras, FX/tax envelope and privacy agreement have not been verified for this account.",
);
try {
  report.checkoutRevision = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  report.checkoutDirty = Boolean(
    execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim(),
  );
} catch {
  /* explicit absent revision */
}
const output = resolve(root, "docs/evidence/nona-cloud-preflight-20261019.json");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      ...report,
      gateway: report.gateway ? { ...report.gateway, pricing: "recorded-in-evidence" } : null,
    },
    null,
    2,
  ),
);
