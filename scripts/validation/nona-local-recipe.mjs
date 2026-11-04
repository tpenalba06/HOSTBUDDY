import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Exercises only the real local lab. No key, external URL or guided fallback.
const origin = "http://127.0.0.1:4182";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
let page;
const startupDeadline = Date.now() + 15000;
while (Date.now() < startupDeadline) {
  try {
    page = await fetch(origin, { signal: AbortSignal.timeout(1000) });
    break;
  } catch {
    await new Promise((done) => setTimeout(done, 250));
  }
}
assert.ok(page, "Local lab did not start");
assert.equal(page.status, 200);
assert.match(await page.text(), /data-local="true"/);
const cookie = page.headers.get("set-cookie").split(";")[0];
const headers = { cookie, origin, "content-type": "application/json" };
const status = await (await fetch(origin + "/status", { headers: { cookie } })).json();
assert.equal(status.localOnly, true);
assert.equal(status.ready, true);
assert.equal(status.localModel, "qwen3.5:9b");
assert.equal(status.paidApisEnabled, false);
assert.equal((await fetch(origin + "/status")).status, 403);
assert.equal(
  (
    await fetch(origin + "/chat", {
      method: "POST",
      headers: { ...headers, origin: "https://untrusted.invalid" },
      body: "{}",
    })
  ).status,
  403,
);
assert.equal(
  (await fetch(origin + "/configure", { method: "POST", headers, body: "{}" })).status,
  403,
);
assert.equal(
  (await fetch(origin + "/chat", { method: "POST", headers, body: JSON.stringify({ mode: "ai" }) }))
    .status,
  403,
);
assert.equal((await fetch(origin + "/api/public/orders", { headers: { cookie } })).status, 404);
const cases = [
  { name: "bonjour", messages: ["Coucou Nona, tu vas bien ?"] },
  {
    name: "petit-dejeuner",
    messages: [
      "Je voudrais un petit-déjeuner, mon ventre commence à râler",
      "Pour deux personnes",
      "Demain",
      "09:00",
      "Classique",
    ],
  },
  {
    name: "massage",
    messages: [
      "Un massage, je suis complètement noué des épaules",
      "Pour deux personnes",
      "Demain",
      "14:00",
    ],
  },
  { name: "arrivee-anticipee", messages: ["Est-ce que je peux arriver plus tôt que prévu ?"] },
  { name: "wifi", messages: ["Comment je me connecte au Wi-Fi ?"] },
  { name: "restaurant-italien", messages: ["Tu me conseilles un restaurant italien ?"] },
  { name: "restaurants", messages: ["Quelles bonnes adresses pour dîner ?"] },
];
const evidence = {
  checkedAt: new Date().toISOString(),
  status,
  paidApiCalls: 0,
  checks: [],
  passed: false,
};
let failed = false;
for (const scenario of cases) {
  let draft = {},
    savedDrafts = [],
    history = [],
    dialogueHistory = [];
  const conversationId = crypto.randomUUID();
  for (const message of scenario.messages) {
    const started = performance.now();
    const response = await fetch(origin + "/chat", {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(130000),
      body: JSON.stringify({
        mode: "local",
        locale: "fr",
        message,
        draft,
        savedDrafts,
        history,
        dialogueHistory,
        conversationId,
        requestId: crypto.randomUUID(),
        timeZone: "Europe/Paris",
      }),
    });
    const turn = await response.json();
    let error;
    try {
      assert.equal(response.status, 200, JSON.stringify(turn));
      assert.equal(turn.provider, "ollama-local");
      assert.equal(turn.localModel, status.localModel);
      assert.equal(turn.mode, "ai");
      assert.equal(turn.usage.estimatedCostMicros, 0);
      assert.ok([1, 2, 3].includes(turn.usage.modelCalls));
      assert.doesNotMatch(turn.text, /\b(vous|votre|vos)\b/i);
      assert.doesNotMatch(turn.text, /en route|déjà commandé|c.est réservé|c.est confirmé/i);
      if (scenario.name === "petit-dejeuner" || scenario.name === "massage") {
        assert.ok(turn.services.length > 0, "service absent");
        if (message === "Pour deux personnes") {
          assert.equal(turn.draft.quantity, 2);
          assert.notEqual(turn.nextStep, "quantity");
        }
      }
      if (scenario.name === "wifi") {
        assert.ok(turn.facts.length > 0, "Wi-Fi source absent");
        assert.doesNotMatch(turn.text, /porte|papier|feuille/i);
      }
      if (scenario.name === "arrivee-anticipee")
        assert.ok(turn.facts.length > 0, "arrival source absent");
      if (scenario.name === "restaurant-italien")
        assert.ok(["italian", "italianNone"].includes(turn.persona));
      if (scenario.name === "restaurants")
        assert.ok(turn.places.length > 0, "source addresses missing");
      if (
        (scenario.name === "petit-dejeuner" && message === "Classique") ||
        (scenario.name === "massage" && message === "14:00")
      ) {
        assert.equal(turn.nextStep, "ready");
        assert.ok(turn.quote && turn.quote.totalCents > 0, "server quote missing");
      }
    } catch (e) {
      error = e.message;
      failed = true;
    }
    const check = {
      scenario: scenario.name,
      message,
      elapsedMs: Math.round(performance.now() - started),
      turn,
      passed: !error,
      ...(error ? { error } : {}),
    };
    evidence.checks.push(check);
    console.log(JSON.stringify(check));
    if (error) break;
    draft = turn.draft;
    if (draft.serviceId)
      savedDrafts = [...savedDrafts.filter((d) => d.serviceId !== draft.serviceId), draft].slice(
        -4,
      );
    history = [...history, message].slice(-6);
    dialogueHistory = [
      ...dialogueHistory,
      { role: "user", text: message.slice(0, 700) },
      { role: "assistant", text: turn.text.slice(0, 700) },
    ].slice(-10);
  }
}
evidence.passed = !failed;
await mkdir(resolve(root, "docs/evidence"), { recursive: true });
await writeFile(
  resolve(root, "docs/evidence/nona-local-recipe-20261017.json"),
  JSON.stringify(evidence, null, 2),
);
if (failed) process.exitCode = 1;
