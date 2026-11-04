import { normalize, type ConciergeTurn } from "./concierge";

// Deliberately conservative lexical checks, not language detection or a semantic
// proof. A refusal preserves validated cards/draft and uses the guided voice.
const languageMarkers: Record<string, ReadonlySet<string>> = Object.fromEntries(
  Object.entries({
    fr: "avec pour quel quelle quelles combien souhaites souhaite voudrais peux tes ton ta est sont dans voici rien avant demain",
    en: "the your you would could should which how many with without have has will this that these those nothing until hours driving exhausting",
    es: "cuantas cuantos quieres deseas puedes para manana anfitrion solicitud desayuno nada hasta confirmes",
    de: "wie viele welchen welche mochtest darf fur dich dein deine deinen deiner nichts bevor bestatigst gastgeber fruhstuck",
    it: "quante quanti vuoi desideri posso per domani colazione richiesta nulla finche confermi riepilogo",
    pt: "quantas quantos queres desejas podes para amanha pequeno almoco pedido nada ate confirmares anfitriao",
  }).map(([locale, words]) => [locale, new Set(words.split(" "))]),
);

export function hasForeignLanguageSegment(text: string, locale: string) {
  const expected = languageMarkers[locale];
  if (!expected) return true;
  const words = normalize(text).match(/[a-z]+/g) ?? [];
  for (let start = 0; start < words.length; start++) {
    const window = new Set(words.slice(start, start + 8));
    const native = [...window].filter((word) => expected.has(word)).length;
    for (const [other, markers] of Object.entries(languageMarkers)) {
      if (other === locale) continue;
      const foreign = [...window].filter((word) => markers.has(word) && !expected.has(word)).length;
      if (foreign >= 3 && foreign > native + 1) return true;
    }
  }
  return false;
}

const fieldCues: Record<string, RegExp> = {
  quantity:
    /\b(?:combien|personnes?|convives?|how many|people|guests?|cuant[oa]s?|personas?|wie viele|personen|quant[ei]|persone|quant[oa]s|pessoas)\b/,
  date: /\b(?:jour|date|day|dia|fecha|tag|datum|giorno)\b/,
  time: /\b(?:heure|horaire|time|hora|horario|uhr|uhrzeit|ora|orario|horas)\b/,
  option:
    /\b(?:formule|option|choix|choisis|choice|choose|opcion|eliges|variante|auswahl|wahl|opzione|preferisci|opcao|escolhes)\b/,
};
const notSent: Record<string, RegExp> = {
  fr: /(?:rien|aucune demande|ta demande|elle|ce).{0,25}(?:n'est|ne sera|pas|n'a).{0,15}envoy|rien.{0,15}envoy/,
  en: /(?:nothing|no request).{0,20}(?:sent|submitted)|not.{0,12}(?:sent|submitted)/,
  es: /(?:nada|ninguna solicitud).{0,25}envi|no.{0,15}envi/,
  de: /(?:nichts|nicht|keine anfrage).{0,25}(?:gesendet|versandt|verschickt)/,
  it: /(?:nulla|niente).{0,25}(?:inviat|invia)|non.{0,15}inviat/,
  pt: /(?:nada|nenhum pedido).{0,25}envi|nao.{0,15}envi/,
};

export function validateDialogueCoherence(text: string, turn: ConciergeTurn, locale: string) {
  const folded = normalize(text);
  if (hasForeignLanguageSegment(text, locale)) throw new Error("dialogue-language-mismatch");
  // A single English discourse marker can leak through an otherwise localized
  // reply; the segment heuristic deliberately needs several matching words.
  if (locale !== "en" && /\bseriously\b/.test(folded))
    throw new Error("dialogue-language-mismatch");
  // A property's pool does not establish a service location. Keep location
  // promises out of model prose; the verified service card is authoritative.
  if (
    /\b(?:au bord de la piscine|pres de la piscine|by the pool|poolside|am pool|junto a la piscina|a bordo piscina|junto a piscina)\b/.test(
      folded,
    )
  )
    throw new Error("dialogue-unverified-service-location");
  if (turn.nextStep && fieldCues[turn.nextStep]) {
    // Metadata alone cannot prove that the actual question asks the right field.
    const question = folded.split(/[.!;¿]/).find((sentence) => sentence.includes("?")) ?? "";
    if (!fieldCues[turn.nextStep]!.test(question)) throw new Error("dialogue-question-mismatch");
    if (
      Object.entries(fieldCues).some(
        ([field, cue]) => field !== turn.nextStep && cue.test(question),
      )
    )
      throw new Error("dialogue-extra-field");
  }
  if (turn.nextStep === "ready" && !notSent[locale]?.test(folded))
    throw new Error("dialogue-submission-boundary-missing");

  // No external action is performed by a proposal, even at the ready step.
  if (
    /(?:j'ai|je viens de|nous avons).{0,25}(?:envoye|transmis|contacte|prevenu)|(?:i have|i've|we have).{0,25}(?:sent|submitted|contacted|notified)|\b(?:he enviado|he contactado|ho inviato|ho contattato|ja enviei|ja contactei)\b|ich habe.{0,35}(?:gesendet|kontaktiert)/.test(
      folded,
    ) ||
    /(?:hote|host|anfitrion|anfitriao|gastgeber).{0,25}(?:reviendra|te recontactera|will (?:reply|contact|confirm)|te contactara|ti contattera)/.test(
      folded,
    )
  )
    throw new Error("dialogue-external-action-claim");

  // Source titles do not establish the presence of a particular credential or
  // complete answer. Honest uncertainty and neutral source pointers stay allowed.
  const source =
    /\b(?:carte|fiche|livret|guide|card|guia|tarjeta|guida|gastebuch|karte|section|rubrique|seccion|sezione|abschnitt|seccao)\b/;
  const promisesContent =
    /(?:tout (?:y est|est (?:note|indique|dans|sur|ecrit))|toutes? les (?:infos|informations)|all (?:the )?(?:details|information)|everything|todos? los (?:datos|detalles)|tutta|tutte|alle (?:infos|informationen)|todas? as informacoes)|(?:tu trouveras|you(?:'ll| will) find|encontraras|troverai|findest).{0,35}(?:code|password|passe|pin|senha|passwort)/;
  if (source.test(folded) && promisesContent.test(folded))
    throw new Error("dialogue-unverified-source-content");
}
