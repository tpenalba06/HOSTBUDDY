import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const origin = "http://127.0.0.1:4182";
const page = await fetch(origin);
const cookie = page.headers.get("set-cookie").split(";")[0];
const headers = { cookie, origin, "content-type": "application/json" };
const status = await (await fetch(origin + "/status", { headers })).json();
assert.equal(status.localOnly, true);
assert.equal(status.paidApisEnabled, false);
assert.equal(status.ready, true);
const cases = [
  ["en", "How do I connect to the Wi-Fi?", /\b(?:you|your|below|the)\b/i],
  ["fr", "Comment je me connecte au Wi-Fi ?", /dessous|informations|carte|\btu\b/i],
  ["es", "¿Cómo me conecto al Wi-Fi?", /puedes|debajo|informacion|aqui|consulta|tarjeta|detalles/i],
  ["de", "Wie verbinde ich mich mit dem Wi-Fi?", /\bdu\b|\bdir\b|unten|hier|informationen|karten/i],
  ["it", "Come mi collego al Wi-Fi?", /puoi|\bqui\b|sotto|informazioni|scheda/i],
  ["pt", "Como me ligo ao Wi-Fi?", /podes|abaixo|informacoes|aqui|teu|cartao/i],
];
const evidence = {
  checkedAt: new Date().toISOString(),
  paidApiCalls: 0,
  checks: [],
  passed: false,
};
try {
  for (const [locale, message, expected] of cases) {
    const response = await fetch(origin + "/chat", {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(130000),
      body: JSON.stringify({
        mode: "local",
        locale,
        message,
        draft: {},
        history: [],
        dialogueHistory: [],
        conversationId: crypto.randomUUID(),
        requestId: crypto.randomUUID(),
        timeZone: "Europe/Paris",
      }),
    });
    const turn = await response.json();
    evidence.checks.push({ locale, status: response.status, turn });
    assert.equal(response.status, 200, JSON.stringify(turn));
    assert.equal(turn.provider, "ollama-local");
    assert.equal(turn.mode, "ai");
    assert.equal(turn.usage.estimatedCostMicros, 0);
    assert.ok(turn.facts.length > 0);
    const folded = turn.text.normalize("NFD").replace(/\p{M}/gu, "");
    assert.match(folded, expected);
    if (locale !== "fr")
      assert.doesNotMatch(folded, /\b(?:bonjour|voici|dessous|regarde|logement)\b/i);
    console.log(
      JSON.stringify({ locale, text: turn.text, modelCalls: turn.usage.modelCalls, passed: true }),
    );
  }
  evidence.passed = true;
} finally {
  await writeFile(
    "docs/evidence/nona-six-languages-20261017.json",
    JSON.stringify(evidence, null, 2),
  );
}
