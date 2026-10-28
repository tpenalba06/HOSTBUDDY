import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

// Offline replay of recorded prose only, NOT fresh generation or a replay of
// business validation. Compile with nona-ollama-free-recipe.mjs --compile-only.
const root = fileURLToPath(new URL("../..", import.meta.url));
const { validateNonaDialogue } = await import("../../.output/ollama-free-recipe/entry.js");
const results = [];
for (const name of ["nona-ollama-live-20261019.json", "nona-ollama-live-20261020.json"]) {
  const evidence = JSON.parse(await readFile(resolve(root, "docs/evidence", name), "utf8"));
  const conversations = [...evidence.conversations];
  if (evidence.diagnostic?.turn)
    conversations.push({ locale: "fr", turns: [evidence.diagnostic.turn] });
  for (const conversation of conversations) {
    for (const [index, saved] of conversation.turns.entries()) {
      if (saved.mode !== "ai") continue;
      // Only fields used by voice checks. No private guide or credential access.
      const turn = {
        nextStep: saved.nextStep,
        services: saved.services ?? [],
        persona: "unknown",
      };
      let refusal = null;
      try {
        validateNonaDialogue(saved.reply, saved.nextStep ?? "none", turn, conversation.locale);
      } catch (error) {
        refusal = error.message;
      }
      results.push({
        source: name,
        locale: conversation.locale,
        turnIndex: index,
        text: saved.reply,
        acceptedByCurrentVoiceGuard: refusal === null,
        refusal,
      });
    }
  }
}
const report = {
  checkedAt: new Date().toISOString(),
  kind: "offline-recorded-prose-replay",
  actualModelCalls: 0,
  databaseCalls: 0,
  newMoneySpentUsd: 0,
  limitation:
    "Lexical guard evaluation only; does not prove semantic accuracy or new model quality.",
  results,
};
await writeFile(
  resolve(root, "docs/evidence/nona-dialogue-replay-20261020.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    checked: results.length,
    accepted: results.filter((r) => r.acceptedByCurrentVoiceGuard).length,
    refused: results.filter((r) => !r.acceptedByCurrentVoiceGuard).length,
    actualModelCalls: 0,
  }),
);
