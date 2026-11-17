import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { extractDocument } from "./document-extractor";
import { previewPastedDocument } from "./public-preview";
import { referenceDocument, referenceLocales } from "./reference-corpus";

export function scoreReference(locale: keyof typeof referenceLocales, words: 500 | 2000 | 5000) {
  const doc = referenceDocument(locale, words);
  const extracted = extractDocument(doc.text);
  const preview = previewPastedDocument(doc.text);
  const missed: string[] = [];
  const misclassified: string[] = [];
  const publicMissing: string[] = [];
  for (const fact of doc.facts) {
    const target =
      fact.key === "name"
        ? extracted.propertyName
        : extracted.fields.find((f) => f.key === fact.key)?.value;
    const expected = fact.key === "name" ? doc.name : fact.text;
    if (!target?.includes(expected)) {
      if (extracted.fields.some((f) => f.value?.includes(expected))) misclassified.push(fact.text);
      else missed.push(fact.text);
    }
    if (!fact.private && !fact.conflict && fact.key !== "wifi") {
      const visible =
        fact.key === "name"
          ? preview.name
          : preview.text?.[fact.key as keyof NonNullable<typeof preview.text>];
      if (!visible?.includes(expected)) publicMissing.push(fact.text);
    }
  }
  const publicText = JSON.stringify(preview);
  const secretsHidden = doc.facts
    .filter((f) => f.private)
    .every((f) => !publicText.includes(f.text) && !publicText.includes(f.text.split(": ")[1]!));
  // Count unsupported excerpts rather than assuming that a successful match means no inventions.
  const invented = extracted.fields
    .flatMap((f) => f.evidence ?? [])
    .filter((e) => !doc.text.includes(e.quote));
  return {
    locale,
    words,
    actualWords: doc.text.split(/\s+/).length,
    expected: doc.facts.length,
    correct: doc.facts.length - missed.length - misclassified.length,
    missed,
    misclassified,
    publicMissing,
    secretsHidden,
    publicConflictHidden: preview.arrival === undefined && preview.text?.arrival === undefined,
    invented: invented.length,
    arrivalReview:
      extracted.fields.find((f) => f.key === "arrival")?.issues?.includes("conflicting_sources") ===
      true,
  };
}

const scores = Object.keys(referenceLocales).flatMap((locale) =>
  ([500, 2000, 5000] as const).map((words) =>
    scoreReference(locale as keyof typeof referenceLocales, words),
  ),
);
if (process.env["NONA_IMPORT_SCORE_PATH"])
  writeFileSync(process.env["NONA_IMPORT_SCORE_PATH"], JSON.stringify(scores, null, 2));
describe("annotated six-language reference corpus (authored synthetic documents)", () => {
  it.each(scores)(
    "$locale / $words words: retains facts, rejects inventions and protects secrets",
    (score) => {
      expect(score.actualWords).toBe(score.words);
      expect(score.correct / score.expected, JSON.stringify(score)).toBeGreaterThanOrEqual(0.95);
      expect(score.publicMissing, JSON.stringify(score)).toEqual([]);
      expect(score.secretsHidden).toBe(true);
      expect(score.invented).toBe(0);
      expect(score.arrivalReview).toBe(true);
      expect(score.publicConflictHidden).toBe(true);
    },
  );
});
