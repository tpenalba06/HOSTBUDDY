import type { PublicGuide } from "./data/public-guide.functions";
import { normalize, validateConciergeTurn, type ConciergeRequest } from "./concierge";

/** Precise access credentials never need inference. Only explicit labelled
 * arrival/keybox values are returned; a section title is not evidence of a code.
 * Preventative allergen questions also cannot be answered from this catalogue,
 * which contains no verified allergen data. The host must supply that detail.
 */
export function sourceBoundaryTurn(input: ConciergeRequest, guide: PublicGuide) {
  const text = normalize(input.message);
  const keybox =
    /\b(?:code|pin|codigo|codice)\b/.test(text) &&
    /boite.{0,8}cles|key.?box|lock.?box|caja.{0,15}llaves|schlusselbox|cassetta.{0,15}chiavi|caixa.{0,15}chaves/.test(
      text,
    );
  const allergens = /allerg|alerg/.test(text);
  if (!keybox && !allergens) return null;
  const turn = validateConciergeTurn(input, guide, {
    intent: "unknown",
    serviceIds: [],
    factKeys: [],
  });
  if (!keybox) return turn;
  const facts = guide.sections.flatMap((section) => {
    // Original source only: translations may contain stale credential values.
    return (section.content.items ?? []).flatMap((item) => {
      const label = normalize(item.label);
      if (
        !/\b(?:code|pin|codigo|codice)\b/.test(label) ||
        !/boite.{0,8}cles|key.?box|lock.?box|schlusselbox|caja.{0,15}llaves|cassetta.{0,15}chiavi|caixa.{0,15}chaves/.test(
          label,
        ) ||
        !item.text?.trim()
      )
        return [];
      return [
        {
          title: section.title,
          text: `${item.label} : ${item.text}`,
          original: guide.originalLocale !== input.locale,
        },
      ];
    });
  });
  if (!facts.length) return turn;
  const pointer = validateConciergeTurn(input, guide, {
    intent: "facts",
    serviceIds: [],
    factKeys: guide.sections
      .filter((s) =>
        s.content.items?.some((item) =>
          facts.some((f) => f.text === `${item.label} : ${item.text}`),
        ),
      )
      .map((s) => s.key)
      .slice(0, 2),
  });
  // Only the exact credential item, not all the contents of its source section.
  return { ...pointer, facts: facts.slice(0, 2) };
}
