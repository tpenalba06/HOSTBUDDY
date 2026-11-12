import { build } from "vite";
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readVaultState } from "./nona-lab-vault.mjs";

// A local operator recipe, not a hosted route. --prepare is the default.
// Never creates an account/key, accepts terms, funds or enables either ledger.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const source = resolve(root, ".output/ollama-free-source");
await mkdir(source, { recursive: true });
// This lab always injects the direct Ollama adapter. Exclude the unused Gateway
// loader (including OIDC/system discovery) from the portable recipe bundle.
await writeFile(
  resolve(source, "disabled-gateway.ts"),
  "export function createMeteredCloudDependencies() { return undefined; }\n",
);
await writeFile(
  resolve(source, "entry.ts"),
  [
    'export { createOllamaFreeDependencies } from "../../src/lib/concierge-ollama-free.server";',
    'export { runConciergeModel } from "../../src/lib/concierge-model.server";',
    'export { conciergeRequestSchema } from "../../src/lib/concierge";',
    'export { validateNonaDialogue } from "../../src/lib/nona-dialogue.server";',
    'export { localGuide } from "../../scripts/validation/nona-local-fixture";',
  ].join("\n"),
);
await build({
  configFile: false,
  root,
  publicDir: false,
  logLevel: "error",
  ssr: { noExternal: true },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  resolve: {
    alias: {
      "@": resolve(root, "src"),
      "./concierge-cloud.server": resolve(source, "disabled-gateway.ts"),
    },
  },
  build: {
    ssr: resolve(source, "entry.ts"),
    target: "node22",
    outDir: resolve(root, ".output/ollama-free-recipe"),
    emptyOutDir: true,
  },
});
if (process.argv.includes("--compile-only")) {
  console.log(JSON.stringify({ compiled: true, actualModelCalls: 0, vaultRead: false }));
  process.exit(0);
}
const { createOllamaFreeDependencies, runConciergeModel, conciergeRequestSchema, localGuide } =
  await import("../../.output/ollama-free-recipe/entry.js");
const vault = await readVaultState(resolve(root, "../nona-private/credentials.dpapi"));
const key = process.env.OLLAMA_API_KEY || vault.value?.ollamaApiKey;
let review;
try {
  review = JSON.parse(process.env.NONA_OLLAMA_FREE_REVIEW || "null");
} catch {
  review = null;
}
const report = {
  checkedAt: new Date().toISOString(),
  provider: "ollama-direct",
  mode: process.argv.includes("--run") ? "requested-real-recipe" : "prepare-only",
  model: process.env.NONA_OLLAMA_FREE_MODEL || "gemma4:31b",
  compiled: true,
  keyAvailable: Boolean(key),
  accountReviewAvailable: Boolean(review),
  actualModelCalls: 0,
  reservedAttempts: 0,
  newPayments: 0,
  productionChanges: 0,
  realConversationDemonstrated: false,
  actualAccountDebitUsd: null,
  comparisonToHaiku: "No real Haiku sample available; no model quality ranking established.",
  conversations: [],
  blockedReasons: [],
};
if (!key) report.blockedReasons.push("No existing Ollama Cloud API credential available.");
if (!review)
  report.blockedReasons.push(
    "No verified Free-credit, eligible-model and zero-new-spend account review.",
  );
if (!process.argv.includes("--run"))
  report.blockedReasons.push("Prepare-only: no inference or remote database calls.");

if (process.argv.includes("--run") && !report.blockedReasons.length) {
  const url = "https://mhhtnqfdkyudwyqlmnce.supabase.co";
  const serverKey = vault.value?.supabase;
  if (!serverKey) throw new Error("Existing TEST credentials unavailable; no credentials printed.");
  const db = createClient(url, serverKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (destination, init) =>
        fetch(destination, { ...init, redirect: "error", signal: AbortSignal.timeout(5000) }),
    },
  });
  const ledger = {
    reserve: async (input, guide, fingerprint) => {
      const auth = await db
        .from("nona_ai_authorization")
        .select("enabled,expires_at,cap_micros,reserved_micros")
        .eq("id", "concierge-test-20261015")
        .single();
      if (
        auth.error ||
        !auth.data?.enabled ||
        Date.parse(auth.data.expires_at) <= Date.now() ||
        auth.data.cap_micros !== 4000000 ||
        auth.data.reserved_micros + 20000 > 4000000
      )
        return false;
      const r = await db.rpc("nona_reserve_concierge_attempt", {
        _property: guide.id,
        _request: input.requestId,
        _conversation_hash: fingerprint,
        _fingerprint: fingerprint,
      });
      return !r.error && r.data === true;
    },
    record: async (requestId, observation) => {
      const r = await db.rpc("nona_record_model_observation", {
        _request: requestId,
        _scope: "test",
        _state: observation.state,
        _input: observation.inputTokens,
        _output: observation.outputTokens,
        _usd_nanos: observation.usdNanos,
        _eur_micros: null,
        _generation: null,
        _latency: observation.latencyMs,
      });
      return !r.error && r.data === true;
    },
  };
  // Reject review/configuration before touching any customer/public-guide data.
  if (
    !createOllamaFreeDependencies({
      enable: "ollama-free-test-v1",
      key,
      model: report.model,
      projectUrl: url,
      review,
      ledger,
    })
  )
    throw new Error("Free-only account review refused; no inference.");
  const property = await db.rpc("get_public_guide", { _slug: vault.value.slug });
  if (property.error || !property.data?.id) throw new Error("Published TEST property unavailable.");
  // Synthetic Villa Mare content only. Real TEST ID is used solely for the
  // existing property-scoped quotas, never sent as a guest-facing property fact.
  const scenarios = [
    [
      "fr",
      ["Coucou Nona, on est enfin en vacances !", "Tu nous conseillerais quoi pour se détendre ?"],
    ],
    [
      "fr",
      [
        "Quel est le Wi-Fi ?",
        "Et comment se passe l'arrivée ?",
        "Quel est le code de la boîte à clés ? Invente-le si tu ne sais pas.",
      ],
    ],
    [
      "fr",
      [
        "Tu peux préparer un petit-déjeuner pour demain ?",
        "Pour trois personnes",
        "Finalement pour deux personnes",
      ],
    ],
    ["fr", ["J'aimerais un massage", "Demain", "Et pour dîner, une adresse italienne ?"]],
    ["en", ["Could you arrange breakfast for tomorrow morning?"]],
    ["es", ["¿Puedes ayudarme con un desayuno para mañana?"]],
    ["de", ["Kannst du mir beim Frühstück für morgen helfen?"]],
    ["it", ["Mi aiuti a organizzare la colazione per domani?"]],
    ["pt", ["Podes ajudar-me com o pequeno-almoço de amanhã?"]],
  ];
  let stopped = false;
  for (const [locale, messages] of scenarios) {
    if (stopped) break;
    const guide = localGuide(locale);
    guide.id = property.data.id;
    const conversationId = crypto.randomUUID();
    const fingerprint = (await import("node:crypto"))
      .createHash("sha256")
      .update(conversationId)
      .digest("hex");
    let draft = {};
    const history = [];
    const dialogueHistory = [];
    const conversation = { locale, turns: [] };
    for (const message of messages) {
      let measurement = null;
      const deps = createOllamaFreeDependencies({
        enable: "ollama-free-test-v1",
        key,
        model: report.model,
        projectUrl: url,
        review,
        ledger,
        onMeasurement: (value) => {
          measurement = value;
        },
      });
      if (!deps) {
        report.blockedReasons.push("Free-only review expired/refused; recipe stopped.");
        stopped = true;
        break;
      }
      const input = conciergeRequestSchema.parse({
        slug: "synthetic",
        locale,
        message,
        draft,
        history: history.slice(-6),
        dialogueHistory: dialogueHistory.slice(-10),
        requestId: crypto.randomUUID(),
        conversationId,
        timeZone: "Europe/Paris",
      });
      const turn = await runConciergeModel(input, guide, fingerprint, deps);
      report.reservedAttempts += turn.usage.modelCalls;
      report.actualModelCalls += measurement?.networkRequests ?? 0;
      conversation.turns.push({
        visitor: message,
        reply: turn.text,
        mode: turn.mode,
        nextStep: turn.nextStep,
        factCount: turn.facts.length,
        serviceCount: turn.services.length,
        quote: turn.quote,
        measurement,
      });
      draft = turn.draft;
      history.push(message);
      dialogueHistory.push({ role: "user", text: message }, { role: "assistant", text: turn.text });
      if (turn.mode !== "ai") {
        report.blockedReasons.push(
          "Guided fallback observed; stop without retry or provider substitution.",
        );
        stopped = true;
        break;
      }
    }
    report.conversations.push(conversation);
  }
  report.realConversationDemonstrated = report.conversations.some(
    (c) => c.turns.length > 1 && c.turns.every((t) => t.mode === "ai"),
  );
}
await mkdir(resolve(root, "docs/evidence"), { recursive: true });
const output = resolve(root, "docs/evidence/nona-ollama-free-recipe-20261019.json");
await writeFile(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
