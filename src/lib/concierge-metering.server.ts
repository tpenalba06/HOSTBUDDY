import { z } from "zod";

export const NONA_CLOUD_MODEL = "anthropic/claude-haiku-5.5";
export const NONA_ATTEMPT_EUR_MICROS = 20_000;
export const NONA_TEST_CAP_EUR_MICROS = 4_000_000;
export const NONA_PREPARED_MONTHLY_CAP_EUR_MICROS = 20_000_000;
export const NONA_MAX_INPUT_TOKENS = 32_768;
export const NONA_MAX_OUTPUT_TOKENS = 800;

// Integer nanodollars per token, normal interactive tier; no caching or extras
// are requested. Regional uplift is included in the reservation proof.
export const NONA_PRICE = { inputNanos: 100, outputNanos: 500 } as const;
const maximumRate = { inputNanos: 110, outputNanos: 550 } as const;

/** A dated billing review is required IN ADDITION to the durable authorization.
 * This record is evidence supplied by an operator, not a provider guarantee.
 * Never manufacture it from a key, balance or an environment enable flag.
 */
export const billingReviewSchema = z
  .object({
    version: z.literal("nona-prepaid-review-v1"),
    keySha256: z.string().regex(/^[a-f0-9]{64}$/),
    evidenceSha256: z.string().regex(/^[a-f0-9]{64}$/),
    reviewedAt: z.string().datetime({ offset: true }),
    expiresAt: z.string().datetime({ offset: true }),
    autoTopupDisabled: z.literal(true),
    byokDisabled: z.literal(true),
    chargeableExtrasDisabled: z.literal(true),
    privacyReviewed: z.literal(true),
    // Must cover FX, VAT and any payment fees, not just the market exchange rate.
    eurMicrosPerUsdCeiling: z.number().int().min(1_000_000).max(2_000_000),
    scope: z.enum(["test", "monthly"]),
    totalAuthorizedEurMicros: z.number().int().positive().max(20_000_000),
  })
  .strict();
export type BillingReview = z.infer<typeof billingReviewSchema>;

export function reviewedBilling(
  value: unknown,
  keyHash: string,
  scope: "test" | "monthly",
  now = Date.now(),
) {
  const parsed = billingReviewSchema.safeParse(value);
  if (!parsed.success) return null;
  const review = parsed.data;
  const at = Date.parse(review.reviewedAt),
    until = Date.parse(review.expiresAt);
  if (
    review.keySha256 !== keyHash ||
    review.scope !== scope ||
    at > now ||
    until <= now ||
    until - at > (scope === "test" ? 86_400_000 : 32 * 86_400_000) ||
    (scope === "test" && review.totalAuthorizedEurMicros > 5_000_000)
  )
    return null;
  return review;
}

export function maximumAttemptEurMicros(eurMicrosPerUsdCeiling: number) {
  if (
    !Number.isSafeInteger(eurMicrosPerUsdCeiling) ||
    eurMicrosPerUsdCeiling < 1_000_000 ||
    eurMicrosPerUsdCeiling > 2_000_000
  )
    throw new Error("invalid-billing-conversion");
  const nanos = BigInt(
    NONA_MAX_INPUT_TOKENS * maximumRate.inputNanos +
      NONA_MAX_OUTPUT_TOKENS * maximumRate.outputNanos,
  );
  return Number((nanos * BigInt(eurMicrosPerUsdCeiling) + 999_999_999n) / 1_000_000_000n);
}

export type ConciergeObservation = {
  state: "measured" | "estimated" | "uncertain";
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
  usdNanos: number | null;
  eurMicros: number | null;
  generationId: string | null;
  latencyMs: number;
};

/** Currency amounts are rounded UP. Observations never release reservations. */
export function observeUsage(
  input: {
    inputTokens?: number | undefined;
    outputTokens?: number | undefined;
    cacheReadTokens?: number | undefined;
    cacheWriteTokens?: number | undefined;
    providerCostUsd?: number | undefined;
    generationId?: string | undefined;
    latencyMs: number;
  },
  review: Pick<BillingReview, "eurMicrosPerUsdCeiling">,
): ConciergeObservation {
  const valid = (n: unknown): n is number => Number.isSafeInteger(n) && Number(n) >= 0;
  const common = {
    generationId:
      input.generationId && /^[a-zA-Z0-9_-]{1,160}$/.test(input.generationId)
        ? input.generationId
        : null,
    latencyMs: Math.max(0, Math.min(120_000, Math.ceil(input.latencyMs))),
  };
  if (
    !valid(input.inputTokens) ||
    !valid(input.outputTokens) ||
    input.inputTokens > NONA_MAX_INPUT_TOKENS ||
    input.outputTokens > NONA_MAX_OUTPUT_TOKENS ||
    (input.cacheReadTokens !== undefined && input.cacheReadTokens !== 0) ||
    (input.cacheWriteTokens !== undefined && input.cacheWriteTokens !== 0)
  )
    return {
      ...common,
      state: "uncertain",
      inputTokens: null,
      outputTokens: null,
      cacheReadTokens: null,
      cacheWriteTokens: null,
      usdNanos: null,
      eurMicros: null,
    };
  const reported = input.providerCostUsd;
  if (reported !== undefined && (!Number.isFinite(reported) || reported < 0))
    return {
      ...common,
      state: "uncertain",
      inputTokens: null,
      outputTokens: null,
      cacheReadTokens: null,
      cacheWriteTokens: null,
      usdNanos: null,
      eurMicros: null,
    };
  const usdNanos =
    reported === undefined
      ? input.inputTokens * NONA_PRICE.inputNanos + input.outputTokens * NONA_PRICE.outputNanos
      : Math.ceil(reported * 1_000_000_000);
  if (!Number.isSafeInteger(usdNanos))
    return {
      ...common,
      state: "uncertain",
      inputTokens: null,
      outputTokens: null,
      cacheReadTokens: null,
      cacheWriteTokens: null,
      usdNanos: null,
      eurMicros: null,
    };
  const eurMicros = Number(
    (BigInt(usdNanos) * BigInt(review.eurMicrosPerUsdCeiling) + 999_999_999n) / 1_000_000_000n,
  );
  return {
    ...common,
    state: reported === undefined ? "estimated" : "measured",
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    usdNanos,
    eurMicros,
  };
}

/** Transparent assumptions, not a claim about actual guest adoption. */
export function estimateConciergeMonth(
  properties: number,
  conversationsPerProperty = 20,
  turnsPerConversation = 6,
  inputTokensPerTurn = 5000,
  outputTokensPerTurn = 180,
) {
  const calls = properties * conversationsPerProperty * turnsPerConversation;
  return {
    properties,
    conversations: properties * conversationsPerProperty,
    calls,
    usd:
      (calls *
        (inputTokensPerTurn * NONA_PRICE.inputNanos +
          outputTokensPerTurn * NONA_PRICE.outputNanos)) /
      1e9,
  };
}
