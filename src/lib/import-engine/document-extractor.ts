import { extractFromText } from "./rules-extractor";
import { FIELD_DEFS } from "./fields";
import type { ExtractedField, ExtractionResult } from "./types";

export const MAX_IMPORT_CHARACTERS = 200_000;
const folded = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const headings: Record<string, RegExp> = {
  wifi: /^(?:wi[ -]?fi|internet|connexion internet)$/,
  arrival: /^(?:arrivee|check[ -]?in|arrival|llegada|ankunft|arrivo)$/,
  departure: /^(?:depart|check[ -]?out|departure|salida|abreise|partenza)$/,
  access: /^(?:acces|access|keys|cles|acceso|zugang|accesso)$/,
  address: /^(?:adresse|address|direccion|anschrift|indirizzo)$/,
  equipment: /^(?:equipements|amenities|equipment|ausstattung|dotazioni)$/,
  rules: /^(?:regles(?: de la maison)?|house rules|reglas|hausregeln|regole)$/,
  contact: /^(?:contacts?|coordonnees|host|hote|contatti)$/,
  recommendations:
    /^(?:bonnes adresses|recommandations|recommendations|nearby|a proximite|consigli)$/,
  services: /^(?:services(?: additionnels)?|extras|prestations|servizi)$/,
  description: /^(?:description|bienvenue|welcome|presentation|descrizione)$/,
  parking: /^(?:parking|stationnement|aparcamiento|parcheggio)$/,
  pool: /^(?:piscine|pool|piscina)$/,
  kitchen: /^(?:cuisine|kitchen|cocina|cucina)$/,
  emergency: /^(?:urgences|emergency|emergencias|notfall)$/,
  trash: /^(?:poubelles|dechets|trash|garbage|rifiuti)$/,
  climate: /^(?:climatisation|chauffage|heating|air conditioning)$/,
};

export function normalizeImportText(text: string) {
  if (text.length > MAX_IMPORT_CHARACTERS) throw new Error("import_text_too_large");
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();
}

/** Bounded chunks cover the entire source, including late corrections. No sampling. */
export function documentChunks(text: string, size = 10_000): string[] {
  const source = normalizeImportText(text);
  const chunks: string[] = [];
  for (let start = 0; start < source.length;) {
    let end = Math.min(start + size, source.length);
    const newline = source.lastIndexOf("\n", end);
    if (end < source.length && newline > start + size / 2) end = newline;
    chunks.push(source.slice(start, end));
    start = end;
  }
  return chunks;
}

function headingEvidence(text: string) {
  const found: Record<string, string[]> = {};
  let key: string | undefined;
  let heading = "";
  for (const line of text.split("\n")) {
    const label = folded(
      line
        .replace(/^\s*[#*\d.)-]+\s*/, "")
        .replace(/[:：]\s*$/, "")
        .trim(),
    );
    const next = Object.keys(headings).find((k) => headings[k]!.test(label));
    if (next) {
      key = next;
      heading = line;
      continue;
    }
    // Any other explicit document heading ends the current section.
    if (/^#{1,6}\s+/.test(line)) {
      key = undefined;
      continue;
    }
    if (key && line.trim()) (found[key] ??= []).push(`${heading}\n${line.trim()}`);
  }
  return found;
}

function conflicts(key: string, quotes: string[]) {
  if (key === "wifi") {
    for (const label of [
      "(?:mot de passe|password|mdp|passwort|contraseña)",
      "(?:ssid|réseau|network)",
    ]) {
      const values = quotes.flatMap((q) =>
        [...q.matchAll(new RegExp(`${label}[^:\\n=]*[:=]\\s*([^\\n]+)`, "gi"))].map((m) =>
          m[1]!.trim(),
        ),
      );
      if (new Set(values).size > 1) return true;
    }
  }
  if (["arrival", "departure"].includes(key)) {
    // Several times in one sentence can be a time window; differing source statements require review.
    const statements = quotes.map((q) =>
      [...q.matchAll(/\b(\d{1,2})\s*(?:h|:)(\d{2})?/g)]
        .map((m) => `${Number(m[1])}:${m[2] ?? "00"}`)
        .join("-"),
    );
    return new Set(statements.filter(Boolean)).size > 1;
  }
  return false;
}

export function extractDocument(text: string, sourceUrl?: string): ExtractionResult {
  const source = normalizeImportText(text);
  const base = extractFromText(source, sourceUrl ? 0.6 : 0.85);
  const contextual = headingEvidence(source);
  const fields = base.fields.map((field): ExtractedField => {
    const quotes = [
      ...new Set([...(field.rawValue?.split("\n") ?? []), ...(contextual[field.key] ?? [])]),
    ];
    if (!quotes.length) return field;
    const conflict = conflicts(field.key, quotes);
    const rawValue = quotes.join("\n");
    const contextualOnly = !field.value;
    return {
      ...field,
      value: rawValue,
      rawValue,
      status: conflict || contextualOnly || sourceUrl ? "to_verify" : field.status,
      confidence: conflict ? Math.min(field.confidence || 0.6, 0.5) : field.confidence || 0.7,
      evidence: quotes.map((quote) => ({
        quote,
        ...(sourceUrl ? { sourceUrl } : {}),
        method: contextualOnly ? "heading" : "rules",
      })),
      ...(conflict ? { issues: ["conflicting_sources"] } : {}),
    };
  });
  return {
    ...base,
    fields,
    analysis: {
      engine: "document",
      inputCharacters: source.length,
      warnings: [],
      ...(sourceUrl ? { sourceUrl } : {}),
    },
  };
}

/** AI proposes classifications, never unsupported facts. Verbatim quotes are mandatory. */
export function mergeQuotedEvidence(
  result: ExtractionResult,
  source: string,
  proposals: { key: string; quote: string }[],
): ExtractionResult {
  const accepted = proposals.filter(
    (p) =>
      FIELD_DEFS.some((f) => f.key === p.key) &&
      p.quote.trim().length >= 3 &&
      source.includes(p.quote),
  );
  return {
    ...result,
    fields: result.fields.map((field) => {
      if (field.manuallyOverridden || field.manuallyVerified) return field;
      const quotes = [...new Set(accepted.filter((p) => p.key === field.key).map((p) => p.quote))];
      if (!quotes.length) return field;
      const raw = [...new Set([...(field.rawValue ? [field.rawValue] : []), ...quotes])].join("\n");
      return {
        ...field,
        value: field.value ? raw : quotes.join("\n"),
        rawValue: raw,
        status: "to_verify" as const,
        confidence: Math.min(field.confidence || 0.75, 0.75),
        evidence: [
          ...(field.evidence ?? []),
          ...quotes.map((quote) => ({ quote, method: "local-ai" as const })),
        ],
        ...(conflicts(field.key, raw.split("\n"))
          ? { issues: ["conflicting_sources" as const] }
          : {}),
      };
    }),
  };
}

/** Reimports are proposals. Human edits and existing nonempty values are never overwritten. */
export function planReimport(existing: ExtractedField[], incoming: ExtractionResult) {
  return incoming.fields.map((field) => {
    const current = existing.find((f) => f.key === field.key);
    const changed = Boolean(current?.value && field.value && current.value !== field.value);
    return {
      key: field.key,
      current: current?.value ?? null,
      proposed: field.value,
      action:
        current?.manuallyOverridden || current?.manuallyVerified
          ? ("preserve_manual" as const)
          : changed
            ? ("review_change" as const)
            : !current?.value && field.value
              ? ("fill_missing" as const)
              : ("unchanged" as const),
      evidence: field.rawValue,
    };
  });
}
