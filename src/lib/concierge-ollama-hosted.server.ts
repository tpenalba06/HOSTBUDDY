import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { ConciergeIdentity } from "./concierge-identity.server";
import type { ModelDependencies } from "./concierge-model.server";
import { createOllamaFreeDependencies } from "./concierge-ollama-free.server";

const testProject = "https://mhhtnqfdkyudwyqlmnce.supabase.co";
const closed: ModelDependencies = {
  reserve: async () => false,
  propose: async () => {
    throw new Error("test-closed");
  },
};
const authorization = z.object({
  enabled: z.literal(true),
  expires_at: z.string().datetime({ offset: true }),
  cap_micros: z.number().int().positive().max(4_000_000),
  reserved_micros: z.number().int().nonnegative(),
});

/** Server-only TEST bridge. Never creates or renews authorization or review.
 * Invalid TEST configuration fails closed instead of selecting another provider.
 * Neither the private key nor the account review is returned to the browser.
 */
export function createHostedOllamaTestDependencies(
  identity: ConciergeIdentity | undefined,
  env: NodeJS.ProcessEnv = process.env,
): ModelDependencies {
  const slug = env["NONA_OLLAMA_TEST_SLUG"];
  const property = env["NONA_OLLAMA_TEST_PROPERTY_ID"];
  const key = env["OLLAMA_API_KEY"];
  const serverKey = env["SUPABASE_SERVICE_ROLE_KEY"];
  if (
    env["NONA_OLLAMA_TEST_ENABLE"] !== "hosted-free-test-v1" ||
    env["VERCEL_ENV"] === "production" ||
    env["NONA_CLOUD_SCOPE"] !== "test" ||
    env["SUPABASE_URL"] !== testProject ||
    !slug ||
    !property ||
    !z.string().uuid().safeParse(property).success ||
    !identity ||
    !key ||
    !serverKey
  )
    return closed;
  let review: unknown;
  try {
    review = JSON.parse(env["NONA_OLLAMA_FREE_REVIEW"] ?? "null");
  } catch {
    return closed;
  }
  // Instantiate the database lazily: an invalid/expired review causes no access.
  const database = () =>
    createClient(testProject, serverKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (destination, init) =>
          fetch(destination, {
            ...init,
            redirect: "error",
            signal: AbortSignal.timeout(5000),
          }),
      },
    });
  return (
    createOllamaFreeDependencies({
      enable: "ollama-free-test-v1",
      key,
      model: "gemma4:31b",
      projectUrl: testProject,
      review,
      ledger: {
        reserve: async (input, guide) => {
          if (
            input.slug !== slug ||
            guide.id !== property ||
            !input.conversationId ||
            !input.requestId
          )
            return false;
          const db = database();
          const state = await db
            .from("nona_ai_authorization")
            .select("enabled,expires_at,cap_micros,reserved_micros")
            .eq("id", "concierge-test-20261015")
            .single();
          const checked = authorization.safeParse(state.data);
          if (
            state.error ||
            !checked.success ||
            Date.parse(checked.data.expires_at) <= Date.now() ||
            checked.data.reserved_micros + 20000 > checked.data.cap_micros
          )
            return false;
          // Server-derived network hash: caller-controlled forwarding headers cannot
          // bypass the existing distributed TEST burst limit. Conversation is tenant-bound.
          const result = await db.rpc("nona_reserve_concierge_attempt", {
            _property: guide.id,
            _request: input.requestId,
            _conversation_hash: createHash("sha256")
              .update(guide.id + ":" + input.conversationId)
              .digest("hex"),
            _fingerprint: identity.networkHash,
          });
          return !result.error && result.data === true;
        },
        record: async (requestId, observation) => {
          const result = await database().rpc("nona_record_model_observation", {
            _request: requestId,
            _scope: "test",
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
    }) ?? closed
  );
}
