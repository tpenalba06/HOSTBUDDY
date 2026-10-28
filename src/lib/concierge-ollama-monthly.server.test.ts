import { createHash } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ rpc: vi.fn(), single: vi.fn(), clients: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => {
    state.clients(...args);
    return {
      rpc: state.rpc,
      from: () => ({ select: () => ({ eq: () => ({ single: state.single }) }) }),
    };
  },
}));
import {
  checkedOllamaMonthlyReview,
  createHostedOllamaMonthlyDependencies,
} from "./concierge-ollama-monthly.server";
import { conciergeRequestSchema } from "./concierge";
import { localGuide } from "../../scripts/validation/nona-local-fixture";
const key = "SYNTHETIC-NEVER-SENT";
const identity = { visitorHash: "a".repeat(64), networkHash: "b".repeat(64) };
const guide = { ...localGuide(), id: "00000000-0000-4000-8000-000000000001" };
const input = conciergeRequestSchema.parse({
  slug: "beta-test",
  locale: "fr",
  message: "Coucou",
  requestId: crypto.randomUUID(),
  conversationId: crypto.randomUUID(),
});
const review = () => ({
  version: "nona-ollama-prepaid-monthly-v1",
  keySha256: createHash("sha256").update(key).digest("hex"),
  evidenceSha256: "c".repeat(64),
  reviewedAt: new Date(Date.now() - 1000).toISOString(),
  expiresAt: new Date(Date.now() + 60000).toISOString(),
  model: "gemma4:31b",
  privacyAndTermsApproved: true,
  providerPrepaidHardStopVerified: true,
  automaticBillingEnabled: false,
  postpaidUsageAvailable: false,
  totalAuthorizedEurMicros: 20_000_000,
  eurMicrosPerUsdCeiling: 2_000_000,
  prepaidBalanceUsd: 5,
});
const env = () => ({
  NONA_OLLAMA_MONTHLY_ENABLE: "prepared-ollama-monthly-v1",
  NONA_CLOUD_SCOPE: "monthly",
  SUPABASE_URL: "https://mhhtnqfdkyudwyqlmnce.supabase.co",
  OLLAMA_API_KEY: key,
  SUPABASE_SERVICE_ROLE_KEY: "SYNTHETIC-SERVER",
  NONA_OLLAMA_MONTHLY_REVIEW: JSON.stringify(review()),
  NONA_OLLAMA_BETA_PROPERTIES: JSON.stringify([{ slug: input.slug, propertyId: guide.id }]),
});
function setup() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url.endsWith("/tags")
        ? Response.json({ models: [{ name: "gemma4:31b", capabilities: ["completion", "tools"] }] })
        : Response.json({
            model: "gemma4:31b",
            done: true,
            prompt_eval_count: 2000,
            eval_count: 100,
            message: {
              role: "assistant",
              tool_calls: [
                {
                  function: {
                    name: "submit_nona_proposal",
                    arguments: {
                      intent: "greeting",
                      dialogue: { text: "Coucou !", questionFor: "none" },
                    },
                  },
                },
              ],
            },
          }),
    ),
  );
  state.single.mockResolvedValue({
    data: {
      enabled: true,
      approved_until: new Date(Date.now() + 60000).toISOString(),
      monthly_cap_micros: 20_000_000,
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
  { automaticBillingEnabled: true },
  { postpaidUsageAvailable: true },
  { providerPrepaidHardStopVerified: false },
  { privacyAndTermsApproved: false },
  { prepaidBalanceUsd: 15 },
  { totalAuthorizedEurMicros: 21_000_000 },
  { expiresAt: "2026-01-01T00:00:00Z" },
  { expiresAt: new Date(Date.now() + 40 * 86400000).toISOString() },
  { keySha256: "d".repeat(64) },
  { model: "another" },
])("rejects insufficient financial/privacy evidence %j", (change) => {
  expect(checkedOllamaMonthlyReview({ ...review(), ...change }, key)).toBeNull();
});

it.each([
  { NONA_OLLAMA_MONTHLY_ENABLE: "" },
  { NONA_CLOUD_SCOPE: "test" },
  { VERCEL_ENV: "production" },
  { SUPABASE_URL: "https://production.supabase.co" },
  { NONA_OLLAMA_MONTHLY_REVIEW: "null" },
  { NONA_OLLAMA_BETA_PROPERTIES: "[]" },
])("fails closed before any access for %j", async (change) => {
  setup();
  const d = createHostedOllamaMonthlyDependencies(identity, { ...env(), ...change });
  expect(await d.reserve(input, guide, "spoofed")).toBe(false);
  expect(state.clients).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it("does not authorize monthly usage with an unsigned identity or an old Free review", async () => {
  setup();
  for (const id of [undefined, { visitorHash: "spoof", networkHash: identity.networkHash }])
    expect(await createHostedOllamaMonthlyDependencies(id, env()).reserve(input, guide, "x")).toBe(
      false,
    );
  expect(
    checkedOllamaMonthlyReview({ ...review(), version: "nona-ollama-free-review-v1" }, key),
  ).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

it("uses the existing atomic monthly ledger and signed tenant-bound identities, never the browser fingerprint", async () => {
  setup();
  const d = createHostedOllamaMonthlyDependencies(identity, env());
  expect(await d.reserve(input, guide, "spoofed")).toBe(true);
  expect(state.rpc).toHaveBeenCalledWith("nona_reserve_cloud_attempt", {
    _property: guide.id,
    _request: input.requestId,
    _conversation_hash: createHash("sha256")
      .update(guide.id + ":" + input.conversationId)
      .digest("hex"),
    _visitor_hash: identity.visitorHash,
    _network_hash: identity.networkHash,
  });
  await d.propose("synthetic", "fr");
  expect(await d.record!()).toMatchObject({ state: "estimated", eurMicros: null });
  expect(state.rpc).toHaveBeenCalledWith(
    "nona_record_model_observation",
    expect.objectContaining({ _scope: "monthly", _eur_micros: null }),
  );
  await expect(d.propose("again", "fr")).rejects.toThrow();
});

it.each(["disabled", "expired", "too-high", "quota", "foreign"])(
  "makes zero generations on %s",
  async (kind) => {
    setup();
    if (kind === "disabled")
      state.single.mockResolvedValue({ data: { enabled: false }, error: null });
    if (kind === "expired")
      state.single.mockResolvedValue({
        data: {
          enabled: true,
          approved_until: "2026-01-01T00:00:00Z",
          monthly_cap_micros: 20_000_000,
        },
        error: null,
      });
    if (kind === "too-high")
      state.single.mockResolvedValue({
        data: {
          enabled: true,
          approved_until: new Date(Date.now() + 60000).toISOString(),
          monthly_cap_micros: 21_000_000,
        },
        error: null,
      });
    if (kind === "quota") state.rpc.mockResolvedValue({ data: false, error: null });
    const d = createHostedOllamaMonthlyDependencies(identity, env());
    expect(
      await d.reserve(
        { ...input, ...(kind === "foreign" ? { slug: "foreign" } : {}) },
        guide,
        "spoof",
      ),
    ).toBe(false);
    expect(vi.mocked(fetch).mock.calls.every(([u]) => String(u).endsWith("/tags"))).toBe(true);
  },
);
