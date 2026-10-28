import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const calls = [];
// Compiled server smoke with synthetic published data; no listening socket,
// provider, Supabase connection, booking, payment or hosting integration.
globalThis.fetch = async (destination) => {
  const url = String(destination);
  calls.push(url);
  assert.equal(url, "https://nona-demo.invalid/rest/v1/rpc/get_public_guide");
  return Response.json({
    id: "00000000-0000-4000-8000-000000000001",
    name: "Synthetic NONA cloud fixture",
    originalLocale: "fr",
    sections: [
      {
        id: "wifi",
        key: "wifi",
        title: "Wi-Fi",
        content: {
          items: [
            { label: "Réseau", text: "NONA_SYNTHETIC" },
            { label: "Mot de passe", text: "SYNTHETIC_NOT_A_REAL_SECRET" },
          ],
        },
      },
    ],
    services: [],
  });
};
process.env.SUPABASE_URL = "https://nona-demo.invalid";
process.env.SUPABASE_PUBLISHABLE_KEY = "SYNTHETIC-PUBLIC-KEY";
process.env.AI_GATEWAY_API_KEY = "SYNTHETIC-NEVER-SENT";
process.env.NONA_CLOUD_ENABLE = "prepared-metered-v1";
delete process.env.NONA_CLOUD_BILLING_REVIEW;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
const { conciergeResponse } = await import("../../.output/nona-cloud-server/concierge.server.js");
const request = (extra = {}) =>
  new Request("https://nona.example/api/public/concierge", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://nona.example" },
    body: JSON.stringify({
      slug: "synthetic",
      locale: "fr",
      message: "Le Wi-Fi ?",
      requestId: crypto.randomUUID(),
      conversationId: crypto.randomUUID(),
      ...extra,
    }),
  });
const response = await conciergeResponse(request());
assert.equal(response.status, 200);
const turn = await response.json();
assert.equal(turn.mode, "guided");
assert.equal(turn.usage.modelCalls, 0);
assert.match(turn.facts.map((f) => f.text).join("\n"), /SYNTHETIC_NOT_A_REAL_SECRET/);
assert.equal(response.headers.get("cache-control"), "no-store");
assert.equal(
  (await conciergeResponse(request({ propertyId: "foreign-organization" }))).status,
  400,
);
const cross = request();
cross.headers.set("origin", "https://attacker.invalid");
assert.equal((await conciergeResponse(cross)).status, 403);
assert.equal(calls.length, 1);
const evidence = {
  checkedAt: new Date().toISOString(),
  scope: "compiled server; synthetic backend; no browser",
  passed: true,
  status: 200,
  unreviewedCloudCalls: 0,
  noStore: true,
  foreignPropertyRejected: true,
  crossOriginRejected: true,
  sourceWifiPreserved: true,
  externalNetworkRequests: 0,
  generatedModelResponses: 0,
};
await mkdir(resolve(root, "docs/evidence"), { recursive: true });
await writeFile(
  resolve(root, "docs/evidence/nona-cloud-smoke-20261019.json"),
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log(JSON.stringify(evidence));
