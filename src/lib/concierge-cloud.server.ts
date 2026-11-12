import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createGateway, generateText, Output } from "ai";
import { z } from "zod";
import type { ModelDependencies } from "./concierge-model.server";
import type { ConciergeIdentity } from "./concierge-identity.server";
import { nonaSystemPrompt } from "./nona-personality";
import { nonaModelResponseSchema } from "./nona-dialogue.server";
import {
  assertConciergeWireRequest,
  conciergeCatalogueAllowed,
} from "./concierge-cost-guard.server";
import {
  maximumAttemptEurMicros,
  NONA_ATTEMPT_EUR_MICROS,
  NONA_CLOUD_MODEL,
  NONA_MAX_OUTPUT_TOKENS,
  observeUsage,
  reviewedBilling,
  type ConciergeObservation,
} from "./concierge-metering.server";

const testProject = "https://mhhtnqfdkyudwyqlmnce.supabase.co";
const policySchema = z.object({
  enabled: z.literal(true),
  approved_until: z.string(),
  monthly_cap_micros: z.number().int().min(NONA_ATTEMPT_EUR_MICROS).max(20_000_000),
});

/** This is the ONLY cloud activation path. A key or old enable flag is insufficient.
 * No configuration is created, funded, renewed or enabled by this module.
 */
export function createMeteredCloudDependencies(
  identity?: ConciergeIdentity,
): ModelDependencies | undefined {
  const env = process.env;
  if (env["NONA_CLOUD_ENABLE"] !== "prepared-metered-v1") return;
  const scope = env["NONA_CLOUD_SCOPE"];
  if (scope !== "test" && scope !== "monthly") return;
  const key = env["AI_GATEWAY_API_KEY"],
    serverKey = env["SUPABASE_SERVICE_ROLE_KEY"],
    url = env["SUPABASE_URL"];
  if (
    !key ||
    !serverKey ||
    !url ||
    !/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url) ||
    (scope === "test" && url !== testProject) ||
    (scope === "monthly" && !identity)
  )
    return;
  let reviewValue: unknown;
  try {
    reviewValue = JSON.parse(env["NONA_CLOUD_BILLING_REVIEW"] ?? "null");
  } catch {
    return;
  }
  const review = reviewedBilling(
    reviewValue,
    createHash("sha256").update(key).digest("hex"),
    scope,
  );
  if (!review || maximumAttemptEurMicros(review.eurMicrosPerUsdCeiling) > NONA_ATTEMPT_EUR_MICROS)
    return;

  // Generic RPC typing here deliberately stays separate from regenerated product
  // schema: this additive migration is prepared and has NOT been deployed.
  const db = createClient(url, serverKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (destination, init) =>
        fetch(destination, { ...init, redirect: "error", signal: AbortSignal.timeout(5000) }),
    },
  });
  const gateway = createGateway({
    apiKey: key,
    fetch: async (destination, init) => {
      const target = new URL(
        typeof destination === "string" || destination instanceof URL
          ? destination
          : destination.url,
      );
      if (
        target.origin === "https://ai-gateway.vercel.sh" &&
        target.pathname === "/v1/generation" &&
        /^[a-zA-Z0-9_-]{1,160}$/.test(target.searchParams.get("id") ?? "") &&
        (!init?.method || init.method === "GET")
      )
        return fetch(destination, {
          ...init,
          redirect: "error",
          signal: AbortSignal.timeout(3000),
        });
      assertConciergeWireRequest(destination, init);
      return fetch(destination, { ...init, redirect: "error" });
    },
  });
  let reservation: string | null = null;
  let observation: ConciergeObservation | null = null;
  let attempted = false;
  return {
    reserve: async (input, guide, fingerprint) => {
      if (
        !input.requestId ||
        !input.conversationId ||
        reservation ||
        Date.parse(review.expiresAt) <= Date.now()
      )
        return false;
      // Read-only checks, no inference. Missing/changed metadata or zero prepaid
      // credit fails closed BEFORE the durable reservation and model request.
      const [models, credits] = await Promise.all([
        fetch("https://ai-gateway.vercel.sh/v1/models", {
          signal: AbortSignal.timeout(4000),
          cache: "no-store",
          redirect: "error",
        }),
        fetch("https://ai-gateway.vercel.sh/v1/credits", {
          headers: { authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(4000),
          cache: "no-store",
          redirect: "error",
        }),
      ]);
      if (!models.ok || !credits.ok) return false;
      const catalogue = await models.json(),
        account = await credits.json();
      if (
        !conciergeCatalogueAllowed(
          catalogue.data?.find((m: { id: string }) => m.id === NONA_CLOUD_MODEL),
        ) ||
        !Number.isFinite(Number(account.balance)) ||
        Number(account.balance) < 0.0041
      )
        return false;
      // Observation failures keep reservations, but should not go unnoticed:
      // check the prepared migration exists before starting any paid request.
      const observations = await db.from("nona_model_observation").select("request_id").limit(0);
      if (observations.error) return false;
      const conversation = createHash("sha256")
        .update(guide.id + ":" + input.conversationId)
        .digest("hex");
      let args: Record<string, unknown>;
      let rpc: string;
      if (scope === "test") {
        const state = await db
          .from("nona_ai_authorization")
          .select("enabled,expires_at,cap_micros,reserved_micros")
          .eq("id", "concierge-test-20261015")
          .single();
        if (
          state.error ||
          !state.data?.enabled ||
          Date.parse(state.data.expires_at) <= Date.now() ||
          state.data.cap_micros > 4_000_000 ||
          state.data.reserved_micros + NONA_ATTEMPT_EUR_MICROS > state.data.cap_micros ||
          state.data.cap_micros > review.totalAuthorizedEurMicros
        )
          return false;
        rpc = "nona_reserve_concierge_attempt";
        args = {
          _property: guide.id,
          _request: input.requestId,
          _conversation_hash: conversation,
          _fingerprint: fingerprint,
        };
      } else {
        const policy = await db
          .from("nona_cloud_policy")
          .select("enabled,approved_until,monthly_cap_micros")
          .eq("id", "monthly")
          .single();
        const checked = policySchema.safeParse(policy.data);
        if (
          policy.error ||
          !checked.success ||
          Date.parse(checked.data.approved_until) <= Date.now() ||
          checked.data.monthly_cap_micros > review.totalAuthorizedEurMicros
        )
          return false;
        rpc = "nona_reserve_cloud_attempt";
        args = {
          _property: guide.id,
          _request: input.requestId,
          _conversation_hash: conversation,
          _visitor_hash: identity!.visitorHash,
          _network_hash: identity!.networkHash,
        };
      }
      const reserved = await db.rpc(rpc, args);
      if (reserved.error || reserved.data !== true) return false;
      reservation = input.requestId;
      return true;
    },
    propose: async (prompt, locale) => {
      if (!reservation || attempted) throw new Error("reservation-required-or-already-used");
      attempted = true;
      const started = performance.now();
      try {
        const result = await generateText({
          model: gateway(NONA_CLOUD_MODEL),
          system: nonaSystemPrompt(locale),
          prompt,
          output: Output.object({ schema: nonaModelResponseSchema }),
          maxOutputTokens: NONA_MAX_OUTPUT_TOKENS,
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
        const gatewayMeta = result.providerMetadata?.["gateway"];
        const generationId =
          typeof gatewayMeta?.["generationId"] === "string"
            ? gatewayMeta["generationId"]
            : undefined;
        observation = observeUsage(
          {
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
            cacheReadTokens: result.usage.inputTokenDetails.cacheReadTokens,
            cacheWriteTokens: result.usage.inputTokenDetails.cacheWriteTokens,
            ...(generationId ? { generationId } : {}),
            latencyMs: performance.now() - started,
          },
          review,
        );
        // Generation lookup is read-only and separately documented as unbilled;
        // never use Custom Reporting, tags, traces or extra model requests here.
        if (generationId) {
          try {
            const actual = await gateway.getGenerationInfo({ id: generationId });
            if (
              actual.isByok ||
              actual.providerName !== "anthropic" ||
              actual.model !== NONA_CLOUD_MODEL
            )
              throw new Error("unexpected-provider");
            observation = observeUsage(
              {
                inputTokens: actual.promptTokens,
                outputTokens: actual.completionTokens,
                cacheReadTokens: actual.cachedTokens,
                cacheWriteTokens: actual.cacheCreationTokens,
                providerCostUsd: actual.totalCost,
                generationId,
                latencyMs: performance.now() - started,
              },
              review,
            );
          } catch {
            /* Token estimate remains explicit; no generation retry. */
          }
        }
        return result.output;
      } catch {
        observation = observeUsage({ latencyMs: performance.now() - started }, review);
        throw new Error("cloud-model-unavailable");
      }
    },
    record: async () => {
      if (!reservation || !observation) return null;
      const result = await db.rpc("nona_record_model_observation", {
        _request: reservation,
        _scope: scope,
        _state: observation.state,
        _input: observation.inputTokens,
        _output: observation.outputTokens,
        _usd_nanos: observation.usdNanos,
        _eur_micros: observation.eurMicros,
        _generation: observation.generationId,
        _latency: observation.latencyMs,
      });
      return result.error ? null : observation;
    },
  };
}
