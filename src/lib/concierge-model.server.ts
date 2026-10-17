import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createGateway, generateText, Output } from "ai";
import type { PublicGuide } from "./data/public-guide.functions";
import {
  guidedProposal,
  validateConciergeTurn,
  type ConciergeRequest,
  type ConciergeTurn,
} from "./concierge";
import { nonaModelResponseSchema, validateNonaDialogue } from "./nona-dialogue.server";
import { nonaSystemPrompt } from "./nona-personality";
import type { Database } from "./service-database";
import {
  assertConciergeWireRequest,
  conciergeCatalogueAllowed,
} from "./concierge-cost-guard.server";

type ConciergeDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions"> & {
    Functions: Database["public"]["Functions"] & {
      nona_reserve_concierge_attempt: {
        Args: {
          _property: string;
          _request: string;
          _conversation_hash: string;
          _fingerprint: string;
        };
        Returns: boolean;
      };
    };
  };
};

export const NONA_MODEL = "anthropic/claude-haiku-5.5";
export const ATTEMPT_RESERVATION_MICROS = 20000;
export const MAX_PROMPT_BYTES = 12000;
export const MAX_OUTPUT_TOKENS = 800;
export type ModelDependencies = {
  reserve: (input: ConciergeRequest, guide: PublicGuide, fingerprint: string) => Promise<boolean>;
  propose: (prompt: string, locale: ConciergeRequest["locale"]) => Promise<unknown>;
};
// Do not send guide bodies, Wi-Fi credentials, host contacts or receipt tokens to
// the model. It selects source keys; the server renders their exact contents.
export function modelContext(input: ConciergeRequest, guide: PublicGuide) {
  const redact = (text: string) =>
    text
      .replace(/[a-f0-9]{64}/gi, "[private]")
      .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[contact]")
      .replace(/(?:\+?\d[\d ().-]{7,}\d)/g, "[contact]");
  return JSON.stringify({
    message: redact(input.message),
    history: input.history.map(redact),
    dialogueHistory: input.dialogueHistory.map(({ role, text }) => ({ role, text: redact(text) })),
    locale: input.locale,
    today: new Intl.DateTimeFormat("en-CA", { timeZone: input.timeZone }).format(new Date()),
    timeZone: input.timeZone,
    draft: input.draft,
    savedDrafts: input.savedDrafts,
    fieldRules:
      "Choose one missing field. For massage usually ask date first; breakfast usually quantity first. Date/time required when requestDate or slots exist; quantity and options when configured. Never ask again for a valid supplied field. ready only when all required fields are present.",
    facts: guide.sections.map((s) => ({ key: s.key, title: s.title.slice(0, 120) })),
    services: (guide.services ?? []).slice(0, 25).map((s) => ({
      id: s.id,
      name: s.name.slice(0, 120),
      description: s.description.slice(0, 300),
      config: {
        maxQuantity: s.bookingConfig?.maxQuantity,
        requestDate: s.bookingConfig?.requestDate,
        slots: s.bookingConfig?.slots.slice(0, 24),
        options: s.bookingConfig?.options.map((o) => ({ id: o.id, label: o.label })),
      },
    })),
  });
}
export async function runConciergeModel(
  input: ConciergeRequest,
  guide: PublicGuide,
  fingerprint: string,
  deps?: ModelDependencies,
): Promise<ConciergeTurn> {
  const fallback = guidedProposal(input, guide);
  const guided = validateConciergeTurn(input, guide, fallback);
  // Quote refreshes, status reads and distress never need a model; private status
  // stays in the existing receipt transport, entirely outside model context.
  if (!input.message || fallback.intent === "emergency" || fallback.intent === "tracking")
    return guided;
  const dependencies = deps ?? productionDependencies();
  if (!dependencies || !input.requestId || !input.conversationId) return guided;
  const prompt = modelContext(input, guide);
  if (Buffer.byteLength(prompt, "utf8") > MAX_PROMPT_BYTES) return guided;
  let reserved = false;
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
    if (proposal.intent === "emergency" || proposal.intent === "tracking")
      return { ...turn, usage: { modelCalls: 1, estimatedCostMicros: ATTEMPT_RESERVATION_MICROS } };
    const text = validateNonaDialogue(dialogue.text, dialogue.questionFor, turn, input.locale);
    return {
      ...turn,
      text,
      mode: "ai",
      usage: { modelCalls: 1, estimatedCostMicros: ATTEMPT_RESERVATION_MICROS },
    };
  } catch {
    // An uncertain/failed billable attempt keeps its entire reservation. Never
    // retry automatically, and never return provider errors or secrets.
    return {
      ...guided,
      usage: {
        modelCalls: reserved ? 1 : 0,
        estimatedCostMicros: reserved ? ATTEMPT_RESERVATION_MICROS : 0,
      },
    };
  }
}
function productionDependencies(): ModelDependencies | undefined {
  // Key alone cannot activate spending. Only isolated TEST is eligible for this
  // authorization. Billing envelope must be verified externally first (see doc).
  if (
    process.env["NONA_AI_ENABLE"] !== "isolated-test-v1" ||
    process.env["NONA_AI_BILLING_ENVELOPE"] !== "verified-eur-ceiling-v1" ||
    !process.env["AI_GATEWAY_API_KEY"] ||
    !process.env["SUPABASE_SERVICE_ROLE_KEY"] ||
    process.env["SUPABASE_URL"] !== "https://mhhtnqfdkyudwyqlmnce.supabase.co"
  )
    return;
  const gateway = createGateway({
    apiKey: process.env["AI_GATEWAY_API_KEY"],
    fetch: async (url, init) => {
      assertConciergeWireRequest(url, init);
      return fetch(url, { ...init, redirect: "error" });
    },
  });
  return {
    reserve: async (input, guide, fingerprint) => {
      // Public model catalogue read only. Unknown/increased prices fail closed.
      const response = await fetch("https://ai-gateway.vercel.sh/v1/models", {
        signal: AbortSignal.timeout(3000),
        cache: "no-store",
      });
      if (!response.ok) return false;
      const catalogue = await response.json();
      const model = catalogue.data?.find((m: { id: string }) => m.id === NONA_MODEL);
      if (!conciergeCatalogueAllowed(model)) return false;
      const db = createClient<ConciergeDatabase>(
        process.env["SUPABASE_URL"]!,
        process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const { data, error } = await db.rpc("nona_reserve_concierge_attempt", {
        _property: guide.id,
        _request: input.requestId!,
        _conversation_hash: createHash("sha256").update(input.conversationId!).digest("hex"),
        _fingerprint: fingerprint,
      });
      return !error && data === true;
    },
    propose: async (prompt, locale) => {
      const result = await generateText({
        model: gateway(NONA_MODEL),
        system: nonaSystemPrompt(locale),
        prompt,
        output: Output.object({ schema: nonaModelResponseSchema }),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        maxRetries: 0,
        timeout: 8000,
        providerOptions: {
          gateway: {
            only: ["anthropic"],
            models: [],
            zeroDataRetention: true,
            disallowPromptTraining: true,
          },
          anthropic: { thinking: { type: "disabled" } },
        },
      });
      return result.output;
    },
  };
}
