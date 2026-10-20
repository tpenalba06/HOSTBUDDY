import { createHash } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  rpc: vi.fn(),
  single: vi.fn(),
  clients: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => {
    state.clients(...args);
    return {
      rpc: state.rpc,
      from: () => ({ select: () => ({ eq: () => ({ single: state.single }) }) }),
    };
  },
}));
import { createHostedOllamaTestDependencies } from "./concierge-ollama-hosted.server";
import { conciergeRequestSchema } from "./concierge";
import { localGuide } from "../../scripts/validation/nona-local-fixture";
const key = "SYNTHETIC-OLLAMA-KEY";
const guide = { ...localGuide(), id: crypto.randomUUID() };
const identity = { visitorHash: "a".repeat(64), networkHash: "b".repeat(64) };
const input = conciergeRequestSchema.parse({
  slug: "test-only",
  locale: "fr",
  message: "Coucou",
  requestId: crypto.randomUUID(),
  conversationId: crypto.randomUUID(),
});
const env = (): NodeJS.ProcessEnv => ({
  NONA_OLLAMA_TEST_ENABLE: "hosted-free-test-v1",
  NONA_CLOUD_SCOPE: "test",
  SUPABASE_URL: "https://mhhtnqfdkyudwyqlmnce.supabase.co",
  NONA_OLLAMA_TEST_SLUG: input.slug,
  NONA_OLLAMA_TEST_PROPERTY_ID: guide.id,
  OLLAMA_API_KEY: key,
  SUPABASE_SERVICE_ROLE_KEY: "SYNTHETIC-SERVER-KEY",
  NONA_OLLAMA_FREE_REVIEW: JSON.stringify({
    version: "nona-ollama-free-review-v1",
    keySha256: createHash("sha256").update(key).digest("hex"),
    evidenceSha256: "c".repeat(64),
    reviewedAt: new Date(Date.now() - 1000).toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    existingAccountTermsAccepted: true,
    freePlanVerified: true,
    privacyReviewed: true,
    paymentMethodAddedForRecipe: false,
    paidUsageAvailable: false,
    automaticBillingEnabled: false,
    purchasedBalanceUsd: 0,
    freeUsageRemainingPercent: 90,
    freeModelIds: ["gemma4:31b"],
    maximumNewSpendEur: 0,
  }),
});
function prepare() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ models: [{ name: "gemma4:31b", capabilities: ["completion", "tools"] }] }),
    ),
  );
  state.single.mockResolvedValue({
    data: {
      enabled: true,
      expires_at: new Date(Date.now() + 60000).toISOString(),
      cap_micros: 4000000,
      reserved_micros: 980000,
    },
    error: null,
  });
  state.rpc.mockResolvedValue({ data: true, error: null });
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it.each([
  { VERCEL_ENV: "production" },
  { NONA_CLOUD_SCOPE: "monthly" },
  { SUPABASE_URL: "https://production.supabase.co" },
  { NONA_OLLAMA_TEST_PROPERTY_ID: "" },
  { NONA_OLLAMA_FREE_REVIEW: "null" },
])("refuses unsafe hosted configuration before database or model access: %j", async (override) => {
  prepare();
  const deps = createHostedOllamaTestDependencies(identity, { ...env(), ...override });
  expect(await deps.reserve(input, guide, "untrusted")).toBe(false);
  expect(state.clients).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});
it("requires a signed server identity", async () => {
  prepare();
  expect(
    await createHostedOllamaTestDependencies(undefined, env()).reserve(input, guide, "x"),
  ).toBe(false);
  expect(fetch).not.toHaveBeenCalled();
});
it("binds authorization to one published TEST guide and ignores browser fingerprints", async () => {
  prepare();
  const deps = createHostedOllamaTestDependencies(identity, env());
  expect(await deps.reserve(input, guide, "browser-spoof")).toBe(true);
  expect(state.rpc).toHaveBeenCalledWith("nona_reserve_concierge_attempt", {
    _property: guide.id,
    _request: input.requestId,
    _conversation_hash: createHash("sha256")
      .update(guide.id + ":" + input.conversationId)
      .digest("hex"),
    _fingerprint: identity.networkHash,
  });
  expect(await deps.reserve(input, guide, "again")).toBe(false);
});
it.each(["slug", "property"])("refuses a foreign %s without reserving", async (field) => {
  prepare();
  const deps = createHostedOllamaTestDependencies(identity, env());
  expect(
    await deps.reserve(
      { ...input, slug: field === "slug" ? "foreign" : input.slug },
      { ...guide, id: field === "property" ? crypto.randomUUID() : guide.id },
      "x",
    ),
  ).toBe(false);
  expect(state.clients).not.toHaveBeenCalled();
});
it.each([
  { enabled: false },
  { expires_at: new Date(Date.now() - 10000).toISOString() },
  { expires_at: "invalid-date" },
  { reserved_micros: 4000000 },
  { cap_micros: 5000000 },
])("does not renew disabled, expired or exhausted authorization: %j", async (override) => {
  prepare();
  const current = await state.single();
  state.single.mockResolvedValue({ data: { ...current.data, ...override }, error: null });
  expect(await createHostedOllamaTestDependencies(identity, env()).reserve(input, guide, "x")).toBe(
    false,
  );
  expect(state.rpc).not.toHaveBeenCalled();
});
