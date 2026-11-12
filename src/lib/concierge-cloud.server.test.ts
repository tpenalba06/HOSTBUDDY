import { createHash } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  generate: vi.fn(),
  lookup: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc: state.rpc, from: state.from }),
}));
vi.mock("ai", () => ({
  Output: { object: (x: unknown) => x },
  generateText: state.generate,
  createGateway: () => Object.assign(() => "synthetic-model", { getGenerationInfo: state.lookup }),
}));
import { createMeteredCloudDependencies } from "./concierge-cloud.server";
import { conciergeRequestSchema } from "./concierge";
import { createVillaMare, demoGuide } from "@/components/demo/villa-mare-fixture";

const key = "SYNTHETIC-NEVER-SENT";
const guide = () => ({
  ...demoGuide(createVillaMare("fr")),
  id: "00000000-0000-4000-8000-000000000001",
});
const input = () =>
  conciergeRequestSchema.parse({
    slug: "test",
    message: "coucou",
    locale: "fr",
    requestId: crypto.randomUUID(),
    conversationId: crypto.randomUUID(),
  });
function configure(scope = "test") {
  vi.stubEnv("NONA_CLOUD_ENABLE", "prepared-metered-v1");
  vi.stubEnv("NONA_CLOUD_SCOPE", scope);
  vi.stubEnv("AI_GATEWAY_API_KEY", key);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "SYNTHETIC-DB");
  vi.stubEnv("SUPABASE_URL", "https://mhhtnqfdkyudwyqlmnce.supabase.co");
  vi.stubEnv(
    "NONA_CLOUD_BILLING_REVIEW",
    JSON.stringify({
      version: "nona-prepaid-review-v1",
      keySha256: createHash("sha256").update(key).digest("hex"),
      evidenceSha256: "a".repeat(64),
      reviewedAt: new Date(Date.now() - 1000).toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      autoTopupDisabled: true,
      byokDisabled: true,
      chargeableExtrasDisabled: true,
      privacyReviewed: true,
      eurMicrosPerUsdCeiling: 1500000,
      scope,
      totalAuthorizedEurMicros: scope === "test" ? 5000000 : 20000000,
    }),
  );
}
function network(balance = "5", inflated = false) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url.endsWith("/v1/credits")
        ? Response.json({ balance })
        : Response.json({
            data: [
              {
                id: "anthropic/claude-haiku-5.5",
                no_training: "all",
                zdr: "all",
                pricing: { input: inflated ? "1" : "0.0000001", output: "0.0000005" },
              },
            ],
          }),
    ),
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  network();
  state.from.mockImplementation((table: string) => ({
    select: () =>
      table === "nona_model_observation"
        ? { limit: async () => ({ error: null }) }
        : {
            eq: () => ({
              single: async () => ({
                error: null,
                data:
                  table === "nona_cloud_policy"
                    ? {
                        enabled: true,
                        approved_until: new Date(Date.now() + 3600000).toISOString(),
                        monthly_cap_micros: 20000000,
                      }
                    : {
                        enabled: true,
                        expires_at: new Date(Date.now() + 3600000).toISOString(),
                        cap_micros: 4000000,
                        reserved_micros: 0,
                      },
              }),
            }),
          },
  }));
  state.rpc.mockResolvedValue({ data: true, error: null });
  state.generate.mockResolvedValue({
    output: {
      intent: "unknown",
      dialogue: { text: "Coucou, je suis là pour toi !", questionFor: "none" },
    },
    usage: {
      inputTokens: 2500,
      outputTokens: 180,
      inputTokenDetails: { cacheReadTokens: 0, cacheWriteTokens: 0 },
    },
    providerMetadata: { gateway: { generationId: "gen_synthetic" } },
  });
  state.lookup.mockResolvedValue({
    isByok: false,
    providerName: "anthropic",
    model: "anthropic/claude-haiku-5.5",
    totalCost: 0.00034,
    promptTokens: 2500,
    completionTokens: 180,
    cachedTokens: 0,
    cacheCreationTokens: 0,
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("remains off with a key, legacy enable flags or an unreviewed future monthly allowance", () => {
  vi.stubEnv("AI_GATEWAY_API_KEY", key);
  vi.stubEnv("NONA_AI_ENABLE", "isolated-test-v1");
  expect(createMeteredCloudDependencies()).toBeUndefined();
  configure();
  vi.stubEnv("NONA_CLOUD_BILLING_REVIEW", "{}");
  expect(createMeteredCloudDependencies()).toBeUndefined();
  configure("monthly");
  expect(createMeteredCloudDependencies()).toBeUndefined();
  expect(state.generate).not.toHaveBeenCalled();
  expect(state.rpc).not.toHaveBeenCalled();
});
it("does not reserve or invoke a model for zero funds, changed prices or an exhausted durable authorization", async () => {
  configure();
  network("0");
  const a = createMeteredCloudDependencies()!;
  expect(await a.reserve(input(), guide(), "a".repeat(64))).toBe(false);
  expect(state.rpc).not.toHaveBeenCalled();
  network("5", true);
  expect(await createMeteredCloudDependencies()!.reserve(input(), guide(), "a".repeat(64))).toBe(
    false,
  );
  network();
  state.rpc.mockResolvedValue({ data: false, error: null });
  expect(await createMeteredCloudDependencies()!.reserve(input(), guide(), "a".repeat(64))).toBe(
    false,
  );
  expect(state.generate).not.toHaveBeenCalled();
});
it("keeps one durable request ID, makes one constrained generation, and records provider billing", async () => {
  configure();
  const deps = createMeteredCloudDependencies()!,
    r = input();
  expect(await deps.reserve(r, guide(), "a".repeat(64))).toBe(true);
  expect(await deps.reserve(r, guide(), "a".repeat(64))).toBe(false);
  await deps.propose("synthetic context", "fr");
  const observation = await deps.record!();
  expect(state.generate).toHaveBeenCalledTimes(1);
  expect(state.generate.mock.calls[0]![0]).toMatchObject({
    maxOutputTokens: 800,
    maxRetries: 0,
    timeout: 8000,
    providerOptions: {
      gateway: {
        only: ["anthropic"],
        models: [],
        zeroDataRetention: true,
        disallowPromptTraining: true,
      },
    },
  });
  expect(observation).toMatchObject({ state: "measured", usdNanos: 340000, eurMicros: 510 });
  expect(state.rpc.mock.calls[1]![0]).toBe("nona_record_model_observation");
});
it("never retries a failed generation; missing billing remains an explicit estimate", async () => {
  configure();
  const a = createMeteredCloudDependencies()!;
  await a.reserve(input(), guide(), "a".repeat(64));
  state.generate.mockRejectedValueOnce(new Error("private-provider-message"));
  await expect(a.propose("synthetic", "fr")).rejects.toThrow("cloud-model-unavailable");
  expect((await a.record!())!.state).toBe("uncertain");
  expect(state.generate).toHaveBeenCalledTimes(1);
  const b = createMeteredCloudDependencies()!;
  await b.reserve(input(), guide(), "a".repeat(64));
  state.lookup.mockRejectedValue(new Error("not-indexed-yet"));
  await b.propose("synthetic", "fr");
  expect((await b.record!())!.state).toBe("estimated");
});
