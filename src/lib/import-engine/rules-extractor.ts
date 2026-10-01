// Deterministic French keyword extractor. A structured-AI extractor can
// implement the same `Extractor` interface and replace it transparently.
import type { ExtractedField, ExtractionResult, Extractor } from "./types";
import { FIELD_DEFS } from "./fields";

const RULES: Record<string, RegExp> = {
  address: /\b(adresse\b(?! ?s)|situ[ée]e? (au|à|rue)|\d{1,4},? (rue|avenue|av\.|bd|boulevard|chemin|impasse|route|allée|place)\b|\b\d{5}\b)/i,
  arrival: /(arriv[ée]e?|check.?in|à partir de \d{1,2}\s?h|accueil)/i,
  access: /(cl[ée]s?\b|bo[iî]te [àa] cl|code (d'acc[eè]s|portail|porte|bo[iî]te)|digicode|portail|serrure|badge|keynest|cadenas)/i,
  parking: /(parking|se garer|garez|stationn|place de park|garage|voiture)/i,
  wifi: /(wi.?fi|mot de passe|mdp|password|r[ée]seau|ssid|\bbox\b|livebox|freebox)/i,
  capacity: /(\d+\s*(personnes|voyageurs|couchages|chambres?|lits?)|capacit[ée]|canap[ée].?lit)/i,
  equipment: /([ée]quipements?|lave.?linge|machine [àa] laver|s[èe]che.?linge|t[ée]l[ée]|netflix|fer [àa] repasser|barbecue|plancha|jacuzzi|baby.?foot)/i,
  kitchen: /(cuisine|four|micro.?ondes|lave.?vaisselle|cafeti[èe]re|nespresso|frigo|r[ée]frig[ée]rateur|plaques?)/i,
  climate: /(clim|climatisation|chauffage|radiateur|po[êe]le|chemin[ée]e|thermostat|ventilateur)/i,
  pool: /(piscine|spa\b|jacuzzi|baignade|bassin)/i,
  rules: /(interdit|non.?fumeur|ne pas fumer|animaux|f[êe]tes?|bruit|silence|merci de ne|r[èe]gles?)/i,
  trash: /(poubelles?|d[ée]chets?|tri s[ée]lectif|recycl|ordures|conteneur|verre)/i,
  departure: /(d[ée]part|check.?out|quitter le logement|avant \d{1,2}\s?h|lib[ée]rer)/i,
  contact: /(t[ée]l[ée]?phone|t[ée]l\b|whatsapp|appel(ez|er)|joindre|contact|e.?mail|@[\w-]+\.\w+|(\+33|0)\s?[1-9](?:[\s.-]?\d{2}){4})/i,
  emergency: /(urgence|pompiers|samu|\b15\b|\b18\b|\b112\b|m[ée]decin|pharmacie de garde|h[oô]pital)/i,
  recommendations: /(restaurant|boulangerie|march[ée]|plage|recommand|on adore|nos adresses|supermarch[ée]|caf[ée] |bar |balade|randonn)/i,
  services: /(petit.?d[ée]jeuner|m[ée]nage|massage|transfert|navette|location de v[ée]lo|chef [àa] domicile|draps|serviettes en option)/i,
  description: /(bienvenue|magnifique|charmant|lumineux|vue (mer|sur)|au c[œo]eur de|situ[ée]e? [àa])/i,
};

const AMBIGUOUS = /(\?|peut.?[êe]tre|environ|à confirmer|je crois|normalement|sauf si|à v[ée]rifier|xx+)/i;

export function splitSnippets(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split(/\n+|(?<=[.!])\s+(?=[A-ZÀ-Ý])/)
    .map((s) => s.replace(/^[\s•\-*–]+/, "").trim())
    .filter((s) => s.length > 1);
}

function guessName(snippets: string[]): string | null {
  const first = snippets[0];
  if (!first || first.length > 60 || /[.:!?]$/.test(first)) return null;
  const hit = Object.values(RULES).some((r) => r.test(first)) && !/(villa|maison|appartement|chalet|studio|gîte|loft)/i.test(first);
  return hit ? null : first;
}

export function extractFromText(text: string, baseConfidence = 0.85): ExtractionResult {
  const all = splitSnippets(text);
  const name = guessName(all);
  const snippets = name ? all.slice(1) : all;
  const fields: ExtractedField[] = FIELD_DEFS.map((def) => {
    const rule = RULES[def.key];
    const hits = rule ? snippets.filter((s) => rule.test(s)) : [];
    if (!hits.length) return { key: def.key, value: null, status: "missing", rawValue: null, confidence: 0 };
    const unique = [...new Set(hits)].slice(0, 6);
    const joined = unique.join("\n");
    const ambiguous = unique.some((h) => AMBIGUOUS.test(h)) || joined.length < 8;
    const confidence = ambiguous ? Math.min(0.5, baseConfidence) : baseConfidence;
    return { key: def.key, value: joined, status: confidence >= 0.7 ? "found" : "to_verify", rawValue: joined, confidence };
  });
  return { propertyName: name, fields };
}

export const rulesExtractor: Extractor = {
  id: "rules-fr-v1",
  extract: async (text) => extractFromText(text),
};
