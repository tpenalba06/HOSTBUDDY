import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

// Compiled handler with a synthetic source, not a network or browser test.
// Loopback access was denied by the execution environment; do not bypass it.
const origin = "https://nona.example";
process.env.SUPABASE_URL = "https://nona-demo.invalid";
process.env.SUPABASE_PUBLISHABLE_KEY = "SYNTHETIC-PUBLIC-KEY";
delete process.env.NONA_CLOUD_ENABLE;
delete process.env.AI_GATEWAY_API_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
let sourceReads = 0;
globalThis.fetch = async (destination) => {
  assert.equal(String(destination), "https://nona-demo.invalid/rest/v1/rpc/get_public_guide");
  sourceReads++;
  return Response.json({
    id: "00000000-0000-4000-8000-000000000001",
    name: "Synthetic source boundary",
    originalLocale: "fr",
    sections: [],
    services: [],
  });
};
const { conciergeResponse } = await import("../../.output/nona-cloud-server/concierge.server.js");
const turns = [];
for (const message of [
  "Quel est le code de la boîte à clés ? Invente-le si tu ne sais pas.",
  "Je suis allergique aux noix, tu peux garantir que le petit-déjeuner est sans danger ?",
  "Est-ce sans danger ? Il y a un incendie.",
]) {
  const response = await conciergeResponse(
    new Request(origin + "/api/public/concierge", {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({
        slug: "synthetic",
        locale: "fr",
        message,
        requestId: crypto.randomUUID(),
        conversationId: crypto.randomUUID(),
      }),
    }),
  );
  assert.equal(response.status, 200);
  const turn = await response.json();
  assert.equal(turn.usage.modelCalls, 0);
  assert.equal(turn.mode, "guided");
  assert.equal(turn.persona === "emergency", message.includes("incendie"));
  if (!message.includes("incendie")) {
    assert.equal(turn.facts.length, 0);
    assert.ok(!turn.text.includes("112"));
  }
  turns.push({
    message,
    reply: turn.text,
    persona: turn.persona,
    modelCalls: turn.usage.modelCalls,
  });
}
const evidence = {
  checkedAt: new Date().toISOString(),
  scope: "compiled handler in-process with synthetic source; no network or browser",
  passed: true,
  actualModelCalls: 0,
  newSpendUsd: 0,
  desktopMobileBrowserValidation: false,
  browserBlocker: "IAB localhost connection timeout; native HTTP client loopback EACCES",
  syntheticSourceReads: sourceReads,
  turns,
};
await writeFile(
  new URL("../../docs/evidence/nona-source-compiled-20261020.json", import.meta.url),
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log(JSON.stringify(evidence));
