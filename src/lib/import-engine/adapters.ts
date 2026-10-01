import type { Category, ImportAdapter, ImportedField, ImportResult, ImportSource } from "./types";

const now = () => new Date().toISOString();
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function field(
  key: string, label: string, category: Category, value: string | null,
  source: ImportSource, confidence: number, question?: string, raw: string | null = value,
): ImportedField {
  const status = value == null ? "missing" : confidence < 0.7 ? "to_verify" : "found";
  return { key, label, category, value, status, question,
    provenance: { source, raw, importedAt: now(), confidence, manuallyVerified: false, manuallyOverridden: false } };
}

export const URL_STAGES = [
  { id: "read", label: "Lecture du logement" },
  { id: "name", label: "Nom trouvé" },
  { id: "description", label: "Description trouvée" },
  { id: "equipment", label: "Équipements trouvés" },
  { id: "organize", label: "Informations organisées" },
];

export function detectSource(url: string): ImportSource {
  try {
    const h = new URL(url).hostname;
    if (h.includes("airbnb")) return "airbnb";
    if (h.includes("booking")) return "booking";
    if (h.includes("sunver")) return "sunver";
  } catch { /* ignore */ }
  return "website";
}

// Phase 1 mock: no scraping. Real adapters (official APIs, permitted fetch,
// user-supplied exports) will implement the same ImportAdapter contract.
export const mockUrlAdapter: ImportAdapter = {
  id: "mock-url",
  source: "website",
  canHandle: (input) => /^https?:\/\//i.test(input.trim()),
  async run(input, onStage): Promise<ImportResult> {
    const source = detectSource(input);
    for (const s of URL_STAGES) { onStage(s.id); await wait(900); }
    const fields: ImportedField[] = [
      field("name", "Nom du logement", "general", "Villa Mare — vue mer", source, 0.95),
      field("description", "Description", "general", "Villa lumineuse avec piscine, à 5 minutes de la plage.", source, 0.9),
      field("capacity", "Capacité", "house", "8 voyageurs · 4 chambres", source, 0.9),
      field("equipment", "Équipements", "house", "Piscine, cuisine équipée, climatisation, lave-linge", source, 0.85),
      field("checkin", "Heure d'arrivée", "arrival", "À partir de 16h", source, 0.8),
      field("rules", "Règles de la maison", "rules", "Non fumeur. Pas de fêtes.", source, 0.6, "Ces règles sont-elles correctes ?"),
      field("wifi", "Wi-Fi", "wifi", null, source, 0, "Quel est le nom et le mot de passe du Wi-Fi ?"),
      field("parking", "Parking", "parking", null, source, 0, "Où vos voyageurs peuvent-ils se garer ?"),
      field("checkout", "Départ", "departure", null, source, 0, "À quelle heure et comment se passe le départ ?"),
    ];
    return { source, propertyName: "Villa Mare — vue mer", fields };
  },
};

// Deterministic keyword parser. A future structured-AI extractor will
// implement the same contract and can be swapped in transparently.
const RULES: { category: Category; key: string; label: string; words: RegExp; question: string }[] = [
  { category: "arrival", key: "arrival", label: "Arrivée", words: /(arriv|check.?in|cl[ée]s?|bo[iî]te|code d'acc|portail)/i, question: "Comment vos voyageurs entrent-ils dans le logement ?" },
  { category: "parking", key: "parking", label: "Parking", words: /(parking|garer|stationn|voiture|place)/i, question: "Où vos voyageurs peuvent-ils se garer ?" },
  { category: "wifi", key: "wifi", label: "Wi-Fi", words: /(wi.?fi|mot de passe|password|r[ée]seau|box)/i, question: "Quel est le nom et le mot de passe du Wi-Fi ?" },
  { category: "pool", key: "pool", label: "Piscine", words: /(piscine|pool|baignade)/i, question: "Y a-t-il des consignes pour la piscine ?" },
  { category: "departure", key: "departure", label: "Départ", words: /(d[ée]part|check.?out|quitter|partir)/i, question: "À quelle heure et comment se passe le départ ?" },
  { category: "trash", key: "trash", label: "Déchets", words: /(poubelle|d[ée]chet|tri|ordure|recycl)/i, question: "Où jeter les poubelles ?" },
  { category: "contact", key: "contact", label: "Contact", words: /(t[ée]l|whatsapp|appel|contact|@|\+33|0[67]\s?\d)/i, question: "Comment vos voyageurs peuvent-ils vous joindre ?" },
];

export const TEXT_STAGES = [
  { id: "read", label: "Lecture de votre texte" },
  { id: "sort", label: "Tri par thème" },
  { id: "check", label: "Vérification des informations" },
];

export function parseText(text: string): ImportedField[] {
  const chunks = text.split(/\n+|(?<=[.!?])\s+/).map((c) => c.trim()).filter(Boolean);
  return RULES.map((r) => {
    const hits = chunks.filter((c) => r.words.test(c));
    if (!hits.length) return field(r.key, r.label, r.category, null, "text", 0, r.question);
    const ambiguous = hits.some((h) => h.includes("?")) || hits.join(" ").length < 12;
    return field(r.key, r.label, r.category, hits.join(" "), "text", ambiguous ? 0.5 : 0.85, r.question, hits.join("\n"));
  });
}

export const textAdapter: ImportAdapter = {
  id: "keyword-text",
  source: "text",
  canHandle: (input) => input.trim().length > 0,
  async run(input, onStage) {
    for (const s of TEXT_STAGES) { onStage(s.id); await wait(700); }
    return { source: "text", propertyName: null, fields: parseText(input) };
  },
};
