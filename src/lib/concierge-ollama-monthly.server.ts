import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { ConciergeIdentity } from "./concierge-identity.server";
import type { ModelDependencies } from "./concierge-model.server";
import {
  createReviewedOllamaTransport,
  OLLAMA_RECIPE_MODELS,
} from "./concierge-ollama-free.server";

const project = "https://mhhtnqfdkyudwyqlmnce.supabase.co";
const closed: ModelDependencies = {
  reserve: async () => false,
  propose: async () => {
    throw new Error("monthly-closed");
  },
};
// Operator evidence, never generated from possession of a key or a Free review.
// A provider alert is explicitly insufficient. No such review is installed.
export const ollamaMonthlyReviewSchema = z
  .object({
    version: z.literal("nona-ollama-prepaid-monthly-v1"),
    keySha256: z.string().regex(/^[a-f0-9]{64}$/),
    evidenceSha256: z.string().regex(/^[a-f0-9]{64}$/),
    reviewedAt: z.string().datetime({ offset: true }),
    expiresAt: z.string().datetime({ offset: true }),
    model: z.literal("gemma4:31b"),
    privacyAndTermsApproved: z.literal(true),
    providerPrepaidHardStopVerified: z.literal(true),
    automaticBillingEnabled: z.literal(false),
    postpaidUsageAvailable: z.literal(false),
    totalAuthorizedEurMicros: z.number().int().min(20000).max(20_000_000),
    // Includes FX, taxes and fees, not an exchange-rate alert.
    eurMicrosPerUsdCeiling: z.number().int().min(1_000_000).max(2_000_000),
    prepaidBalanceUsd: z.number().finite().positive().max(20),
  })
  .strict();

export function checkedOllamaMonthlyReview(value: unknown, key: string, now = Date.now()) {
  const parsed = ollamaMonthlyReviewSchema.safeParse(value);
  if (!parsed.success) return null;
  const r = parsed.data;
  const at = Date.parse(r.reviewedAt),
    until = Date.parse(r.expiresAt);
  const price = OLLAMA_RECIPE_MODELS["gemma4:31b"];
  const worstAttempt = Math.ceil(
    ((32768 * price.inputNanos + 800 * price.outputNanos) * r.eurMicrosPerUsdCeiling) / 1e9,
  );
  if (
    r.keySha256 !== createHash("sha256").update(key).digest("hex") ||
    at > now ||
    until <= now ||
    until - at > 32 * 86400000 ||
    Math.ceil(r.prepaidBalanceUsd * r.eurMicrosPerUsdCeiling) > r.totalAuthorizedEurMicros ||
    worstAttempt > 20000
  )
    return null;
  return r;
}

/** Prepared private TEST beta only, never production. Requires independent
 * operator funding/privacy evidence AND enabled durable monthly authorization.
 * Never installs keys, funds credit, changes a policy or renews approval.
 * Free-only TEST review cannot unlock this path. */
export function createHostedOllamaMonthlyDependencies(
  identity: ConciergeIdentity | undefined,
  env: NodeJS.ProcessEnv = process.env,
): ModelDependencies {
  if (
    env["NONA_OLLAMA_MONTHLY_ENABLE"] !== "prepared-ollama-monthly-v1" ||
    env["NONA_CLOUD_SCOPE"] !== "monthly" ||
    env["VERCEL_ENV"] === "production" ||
    env["SUPABASE_URL"] !== project ||
    !env["OLLAMA_API_KEY"] ||
    !env["SUPABASE_SERVICE_ROLE_KEY"] ||
    !identity ||
    !/^[a-f0-9]{64}$/.test(identity.visitorHash) ||
    !/^[a-f0-9]{64}$/.test(identity.networkHash)
  )
    return closed;
  let review: ReturnType<typeof checkedOllamaMonthlyReview>;
  let allowed: { slug: string; propertyId: string }[];
  try {
    review = checkedOllamaMonthlyReview(
      JSON.parse(env["NONA_OLLAMA_MONTHLY_REVIEW"] ?? "null"),
      env["OLLAMA_API_KEY"],
    );
    allowed = z
      .array(z.object({ slug: z.string().min(1).max(80), propertyId: z.string().uuid() }).strict())
      .min(1)
      .max(10)
      .parse(JSON.parse(env["NONA_OLLAMA_BETA_PROPERTIES"] ?? "null"));
  } catch {
    return closed;
  }
  if (!review) return closed;
  const checkedReview = review;
  const db = createClient(project, env["SUPABASE_SERVICE_ROLE_KEY"], {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, init) =>
        fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(5000) }),
    },
  });
  return createReviewedOllamaTransport({
    key: env["OLLAMA_API_KEY"],
    model: "gemma4:31b",
    funding: "reviewed-prepaid-hard-stop",
    isAuthorized: () => Date.parse(checkedReview.expiresAt) > Date.now(),
    onDiagnostic: (value) => console.info("NONA_MODEL_DIAGNOSTIC", value),
    ledger: {
      reserve: async (input, guide) => {
        if (!allowed.some((a) => a.slug === input.slug && a.propertyId === guide.id)) return false;
        const policy = await db
          .from("nona_cloud_policy")
          .select("enabled,approved_until,monthly_cap_micros")
          .eq("id", "monthly")
          .single();
        const parsed = z
          .object({
            enabled: z.literal(true),
            approved_until: z.string().datetime({ offset: true }),
            monthly_cap_micros: z.number().int().min(20000).max(20_000_000),
          })
          .safeParse(policy.data);
        if (
          policy.error ||
          !parsed.success ||
          Date.parse(parsed.data.approved_until) <= Date.now() ||
          parsed.data.monthly_cap_micros > checkedReview.totalAuthorizedEurMicros
        )
          return false;
        const result = await db.rpc("nona_reserve_cloud_attempt", {
          _property: guide.id,
          _request: input.requestId,
          _conversation_hash: createHash("sha256")
            .update(guide.id + ":" + input.conversationId)
            .digest("hex"),
          _visitor_hash: identity.visitorHash,
          _network_hash: identity.networkHash,
        });
        return !result.error && result.data === true;
      },
      record: async (request, observation) => {
        // Retail estimates never release reserved financial headroom.
        const result = await db.rpc("nona_record_model_observation", {
          _request: request,
          _scope: "monthly",
          _state: observation.state,
          _input: observation.inputTokens,
          _output: observation.outputTokens,
          _usd_nanos: observation.usdNanos,
          _eur_micros: null,
          _generation: null,
          _latency: observation.latencyMs,
        });
        return !result.error && result.data === true;
      },
    },
  });
}
