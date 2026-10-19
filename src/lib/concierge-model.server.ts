import type { PublicGuide } from "./data/public-guide.functions";
import {
  guidedProposal,
  validateConciergeTurn,
  type ConciergeRequest,
  type ConciergeTurn,
} from "./concierge";
import { nonaModelResponseSchema, validateNonaDialogue } from "./nona-dialogue.server";
import { createMeteredCloudDependencies } from "./concierge-cloud.server";
import type { ConciergeIdentity } from "./concierge-identity.server";
import type { ConciergeObservation } from "./concierge-metering.server";

export const NONA_MODEL = "anthropic/claude-haiku-5.5";
export const ATTEMPT_RESERVATION_MICROS = 20000;
export const MAX_PROMPT_BYTES = 12000;
export const MAX_OUTPUT_TOKENS = 800;
export type ModelDependencies = {
  reserve: (input: ConciergeRequest, guide: PublicGuide, fingerprint: string) => Promise<boolean>;
  propose: (prompt: string, locale: ConciergeRequest["locale"]) => Promise<unknown>;
  record?: () => Promise<ConciergeObservation | null>;
};
// Do not send guide bodies, Wi-Fi credentials, host contacts or receipt tokens to
// the model. It selects source keys; the server renders their exact contents.
export function modelContext(input: ConciergeRequest, guide: PublicGuide) {
  const secrets = guide.sections
    .flatMap((section) => [
      ...(section.content.phones ?? []),
      ...(section.content.emails ?? []),
      ...(section.content.items ?? [])
        .filter(
          (item) =>
            section.key.split("-")[0] === "wifi" ||
            /password|passe|code|pin|senha|passwort|contrasena/i.test(item.label),
        )
        .map((item) => item.text),
    ])
    .filter((value) => value.length >= 3)
    .sort((a, b) => b.length - a.length);
  const redact = (text: string) =>
    secrets
      .reduce((value, secret) => value.split(secret).join("[private]"), text)
      .replace(/[a-f0-9]{64}/gi, "[private]")
      .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[contact]")
      .replace(/(?:\+?\d[\d ().-]{7,}\d)/g, (value) =>
        /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value : "[contact]",
      );
  return JSON.stringify({
    message: redact(input.message),
    history: input.history.map(redact),
    dialogueHistory: input.dialogueHistory.map(({ role, text }) => ({ role, text: redact(text) })),
    locale: input.locale,
    today: new Intl.DateTimeFormat("en-CA", { timeZone: input.timeZone }).format(new Date()),
    timeZone: input.timeZone,
    draft:
      input.draft.serviceId && !guide.services?.some((s) => s.id === input.draft.serviceId)
        ? {}
        : input.draft,
    savedDrafts: input.savedDrafts.filter((d) => guide.services?.some((s) => s.id === d.serviceId)),
    fieldRules:
      "Choose one missing field. For massage usually ask date first; breakfast usually quantity first. Date/time required when requestDate or slots exist; quantity and options when configured. Never ask again for a valid supplied field. ready only when all required fields are present.",
    facts: guide.sections.map((s) => ({ key: s.key, title: redact(s.title).slice(0, 120) })),
    services: (guide.services ?? []).slice(0, 25).map((s) => ({
      id: s.id,
      name: redact(s.name).slice(0, 120),
      description: redact(s.description).slice(0, 300),
      config: {
        maxQuantity: s.bookingConfig?.maxQuantity,
        requestDate: s.bookingConfig?.requestDate,
        slots: s.bookingConfig?.slots.slice(0, 24),
        options: s.bookingConfig?.options.map((o) => ({ id: o.id, label: redact(o.label) })),
      },
    })),
  });
}
export async function runConciergeModel(
  input: ConciergeRequest,
  guide: PublicGuide,
  fingerprint: string,
  deps?: ModelDependencies,
  identity?: ConciergeIdentity,
): Promise<ConciergeTurn> {
  const fallback = guidedProposal(input, guide);
  const guided = validateConciergeTurn(input, guide, fallback);
  // Quote refreshes, status reads and distress never need a model; private status
  // stays in the existing receipt transport, entirely outside model context.
  if (!input.message || fallback.intent === "emergency" || fallback.intent === "tracking")
    return guided;
  const dependencies = deps ?? createMeteredCloudDependencies(identity);
  if (!dependencies || !input.requestId || !input.conversationId) return guided;
  const prompt = modelContext(input, guide);
  if (Buffer.byteLength(prompt, "utf8") > MAX_PROMPT_BYTES) return guided;
  let reserved = false;
  let result = guided;
  let observation: ConciergeObservation | null = null;
  try {
    reserved = await dependencies.reserve(input, guide, fingerprint);
    if (!reserved) return guided;
    const raw = await dependencies.propose(prompt, input.locale);
    const { dialogue, ...proposal } = nonaModelResponseSchema.parse(raw);
    if (
      proposal.serviceIds.some((id) => !guide.services?.some((s) => s.id === id)) ||
      proposal.factKeys.some((key) => !guide.sections.some((s) => s.key === key))
    )
      throw new Error("unknown-source");
    const preferred = dialogue.questionFor === "none" ? null : dialogue.questionFor;
    const turn = validateConciergeTurn(input, guide, proposal, new Date(), preferred);
    // A rejected voice must not discard already validated source cards/draft.
    // This remains guided unless the independent dialogue guard also passes.
    result = turn;
    if (proposal.intent === "emergency" || proposal.intent === "tracking") result = turn;
    else
      result = {
        ...turn,
        text: validateNonaDialogue(dialogue.text, dialogue.questionFor, turn, input.locale),
        mode: "ai",
      };
  } catch {
    // An uncertain/failed billable attempt keeps its entire reservation. Never
    // retry automatically, and never return provider errors or secrets.
    // result is either the original guided fallback or the last fully validated
    // server turn. Never reuse rejected generated prose.
  } finally {
    if (reserved && dependencies.record) {
      try {
        observation = await dependencies.record();
      } catch {
        /* Full reservation remains held. */
      }
    }
  }
  return {
    ...result,
    usage: {
      modelCalls: reserved ? 1 : 0,
      estimatedCostMicros: reserved ? ATTEMPT_RESERVATION_MICROS : 0,
      ...(observation
        ? {
            metering: {
              state: observation.state,
              inputTokens: observation.inputTokens,
              outputTokens: observation.outputTokens,
              costUsd: observation.usdNanos === null ? null : observation.usdNanos / 1e9,
              latencyMs: observation.latencyMs,
            },
          }
        : {}),
    },
  };
}
