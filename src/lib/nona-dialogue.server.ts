import { z } from "zod";
import { conciergeProposalSchema, normalize, type ConciergeTurn } from "./concierge";

/** Free conversation, separated from the server's source cards and booking engine. */
export const nonaModelResponseSchema = conciergeProposalSchema
  .omit({ opening: true })
  .extend({
    dialogue: z
      .object({
        text: z.string().trim().min(1).max(700),
        questionFor: z.enum(["quantity", "date", "time", "option", "ready", "none"]),
      })
      .strict(),
  })
  .strict();

/** Defence in depth, not a semantic proof: real-model evaluation remains required.
 * Generated prose is for empathy, clarification and transitions. Verified values
 * are rendered separately from the original sources, never copied from a model.
 */
export function validateNonaDialogue(
  text: string,
  questionFor: string,
  turn: ConciergeTurn,
  locale: string,
) {
  if (questionFor !== (turn.nextStep ?? "none")) throw new Error("question-mismatch");
  const folded = normalize(text);
  if (
    (text.match(/\?/g)?.length ?? 0) > 1 ||
    /\b(?:euros?|dollars?|usd|eur|gbp|gratuit\w*|gratis|kostenlos\w*|offert\w*)\b/.test(folded) ||
    /\b(?:is|are|it's)\s+(?:(?:completely|totally|entirely|all)\s+)?free\b|\bfor free\b|\b(?:is|are)\s+available\b|\b(?:est|sont)\s+disponibles?\b|\b(?:esta|estan)\s+disponi(?:ble|bles|vel|veis)\b|\b(?:ist|sind)\s+verfugbar\b/.test(
      folded,
    ) ||
    /https?:|www\.|<[^>]*>|\[[^\]]+\]\(|\d|[€$£¥]/i.test(text) ||
    /\b(?:euros?|dollars?|password|passwort|contrasena|senha)\s*(?:is|ist|es|e|:|=)/i.test(
      folded,
    ) ||
    /mot de passe\s*(?:est|:|=)|code\s*(?:est|:|=)/.test(folded) ||
    /(?:c'est|est|bien|deja)\s+(?:reserve|confirme|paye|accepte)|(?:booking|reservation|payment|pago|reserva|prenotazione|zahlung|buchung).{0,25}(?:confirmed|paid|confirmad|pagad|confermat|bestatigt|bezahlt)|(?:j'ai|i have|i've)\s+(?:reserve|booked|confirmed)/.test(
      folded,
    ) ||
    (locale === "fr" && /\b(?:vous|votre|vos)\b/.test(folded)) ||
    ((turn.persona === "massage" ||
      turn.services.some((s) => /massag|masaj/.test(normalize(s.name)))) &&
      /gourmand|miam|croissant/.test(folded))
  )
    throw new Error("untrusted-dialogue");
  return text;
}
