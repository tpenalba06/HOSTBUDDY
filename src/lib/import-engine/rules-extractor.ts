// Deterministic multilingual keyword extractor.
// A structured-AI extractor can implement the same Extractor interface later.
import type { ExtractedField, ExtractionResult, Extractor } from "./types";
import { FIELD_DEFS } from "./fields";

const RULES: Record<string, RegExp> = {
  address:
    /\b(adresse|address|dirección|adresse|indirizzo|morada|situ[ée]e?|located|ubicad[oa]|gelegen|situat[oa]|\d{1,4},?\s+(rue|avenue|road|street|calle|straße|strasse|via|rua|boulevard|chemin|route|place)|\b\d{5}\b)/i,
  arrival:
    /(arriv[ée]e?|check.?in|arrival|llegada|ankunft|arrivo|chegada|à partir de \d{1,2}\s?h|from \d{1,2}(:\d{2})?|ab \d{1,2}(:\d{2})?)/i,
  access:
    /(cl[ée]s?|keys?|llaves?|schl[üu]ssel|chiav[ei]|chaves?|bo[iî]te [àa] cl|lockbox|key box|caja de llaves|schl[üu]sselkasten|cassetta.*chiav|caixa.*chav|access code|code d'acc[eè]s|digicode|portail|gate|portal|t[üu]r|porta|serrure|lock|badge|keynest|cadenas)/i,
  parking:
    /(parking|se garer|stationn|garage|car park|parkplatz|aparcamiento|estacionamiento|parcheggio|estacionamento)/i,
  wifi:
    /(wi.?fi|mot de passe|mdp|password|contraseña|passwort|senha|password|r[ée]seau|network|red wi.?fi|netzwerk|rete wi.?fi|ssid|livebox|freebox)/i,
  capacity:
    /(\d+\s*(personnes|voyageurs|guests?|people|personas|gäste|ospiti|hóspedes|couchages|chambres?|bedrooms?|habitaciones?|schlafzimmer|camere|quartos|lits?|beds?))/i,
  equipment:
    /([ée]quipements?|amenities|equipment|equipamiento|ausstattung|dotazioni|comodidades|lave.?linge|washing machine|lavadora|waschmaschine|lavatrice|máquina de lavar|s[èe]che.?linge|dryer|t[ée]l[ée]|tv\b|netflix|barbecue|plancha|jacuzzi)/i,
  kitchen:
    /(cuisine|kitchen|cocina|küche|cucina|cozinha|four|oven|horno|ofen|forno|micro.?ondes|microwave|lave.?vaisselle|dishwasher|lavavajillas|spülmaschine|lavastoviglie|cafeti[èe]re|coffee machine|nespresso|frigo|refrigerator|frigorífico|kühlschrank|frigorifero)/i,
  climate:
    /(clim|climatisation|air conditioning|air conditioner|aire acondicionado|klimaanlage|aria condizionata|ar condicionado|chauffage|heating|calefacción|heizung|riscaldamento|aquecimento|thermostat)/i,
  pool:
    /(piscine|pool\b|swimming pool|piscina|schwimmbad|spa\b|jacuzzi|baignade)/i,
  rules:
    /(interdit|non.?fumeur|ne pas fumer|no smoking|smoking prohibited|no fumar|nicht rauchen|vietato fumare|não fumar|animaux|pets?|mascotas|haustiere|animali|f[êe]tes?|parties|fiestas|partys|feste|bruit|noise|silence|r[èe]gles?|rules|reglas|hausregeln|regole|regras)/i,
  trash:
    /(poubelles?|d[ée]chets?|trash|garbage|waste|bins?|basura|residuos|müll|abfall|rifiuti|lixo|recycl|tri s[ée]lectif)/i,
  departure:
    /(d[ée]part|check.?out|departure|salida|abreise|partenza|partida|quitter le logement|avant \d{1,2}\s?h|before \d{1,2}|antes de \d{1,2}|bis \d{1,2}|entro le \d{1,2}|até às? \d{1,2})/i,
  contact:
    /(t[ée]l[ée]?phone|phone|telefono|telefon|telefone|whatsapp|contact|e.?mail|correo|email|@[w.-]+\.[a-z]{2,}|(\+\d{1,3}|0)\s?[1-9](?:[\s.-]?\d{2}){4})/i,
  emergency:
    /(urgence|emergency|emergencia|notfall|emergenza|emergência|pompiers|fire brigade|samu|112\b|hospital|h[oô]pital|krankenhaus|ospedale)/i,
  recommendations:
    /(restaurant|boulangerie|bakery|panadería|bäckerei|panificio|padaria|march[ée]|market|mercado|markt|plage|beach|playa|strand|spiaggia|praia|recommand|recommend|empfehl|consigli|recomenda|caf[ée]|bar\b|balade|hike|randonn)/i,
  services:
    /(petit.?d[ée]jeuner|breakfast|desayuno|frühstück|colazione|pequeno.?almoço|m[ée]nage|cleaning|limpieza|reinigung|pulizia|limpeza|massage|transfert|transfer|navette|shuttle|location de v[ée]lo|bike rental|chef [àa] domicile)/i,
  description:
    /(bienvenue|welcome|bienvenido|willkommen|benvenut|bem-vind|magnifique|charmant|beautiful|lovely|bonito|schön|bell[oa]|bonit[oa]|lumineux|bright|vue|view|vista|blick)/i,
};

const AMBIGUOUS =
  /(\?|peut.?[êe]tre|environ|à confirmer|je crois|normalement|sauf si|à v[ée]rifier|maybe|approximately|about|to confirm|I think|probably|quizá|aprox|confirmar|vielleicht|ungefähr|forse|circa|talvez|aproximadamente|xx+)/i;

export function splitSnippets(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split(/\n+|(?<=[.!?])\s+(?=[A-ZÀ-Ý])/)
    .map((s) => s.replace(/^[\s•\-*–]+/, "").trim())
    .filter((s) => s.length > 1);
}

function guessName(snippets: string[]): string | null {
  const first = snippets[0];
  if (!first || first.length > 80 || /[.:!?]$/.test(first)) return null;
  const looksLikeField = Object.values(RULES).some((rule) => rule.test(first));
  const looksLikePropertyName =
    /(villa|maison|house|appartement|apartment|apartamento|wohnung|chalet|studio|g[iî]te|loft|casa|ferienwohnung)/i.test(first);
  return looksLikeField && !looksLikePropertyName ? null : first;
}

export function extractFromText(text: string, baseConfidence = 0.85): ExtractionResult {
  const all = splitSnippets(text);
  const name = guessName(all);
  const snippets = name ? all.slice(1) : all;

  const fields: ExtractedField[] = FIELD_DEFS.map((def) => {
    const rule = RULES[def.key];
    const hits = rule ? snippets.filter((snippet) => rule.test(snippet)) : [];

    if (!hits.length) {
      return {
        key: def.key,
        value: null,
        status: "missing",
        rawValue: null,
        confidence: 0,
      };
    }

    const unique = [...new Set(hits)].slice(0, 8);
    const joined = unique.join("\n");
    const ambiguous = unique.some((hit) => AMBIGUOUS.test(hit)) || joined.length < 8;
    const confidence = ambiguous ? Math.min(0.5, baseConfidence) : baseConfidence;

    return {
      key: def.key,
      value: joined,
      status: confidence >= 0.7 ? "found" : "to_verify",
      rawValue: joined,
      confidence,
    };
  });

  return { propertyName: name, fields };
}

export const rulesExtractor: Extractor = {
  id: "rules-multilingual-v2",
  extract: async (text) => extractFromText(text),
};
