import { createHash } from "node:crypto";
import { expect, it, vi } from "vitest";
import {
  createOllamaFreeDependencies,
  type OllamaFreeLedger,
} from "./concierge-ollama-free.server";
import { conciergeRequestSchema } from "./concierge";
import { runConciergeModel, modelContext } from "./concierge-model.server";
import { localGuide } from "../../scripts/validation/nona-local-fixture";

const key = "SYNTHETIC-NOT-A-REAL-OLLAMA-KEY";
const proposal = {
  intent: "greeting",
  dialogue: { text: "Coucou ! Qu'est-ce qui te ferait plaisir ?", questionFor: "none" },
};
function setup(overrides: Record<string, unknown> = {}) {
  const measurements: unknown[] = [];
  const ledger: OllamaFreeLedger = {
    reserve: vi.fn(async () => true),
    record: vi.fn(async () => true),
  };
  const review = {
    version: "nona-ollama-free-review-v1",
    keySha256: createHash("sha256").update(key).digest("hex"),
    evidenceSha256: "a".repeat(64),
    reviewedAt: new Date(Date.now() - 1000).toISOString(),
    expiresAt: new Date(Date.now() + 300000).toISOString(),
    existingAccountTermsAccepted: true,
    freePlanVerified: true,
    privacyReviewed: true,
    paymentMethodAddedForRecipe: false,
    paidUsageAvailable: false,
    automaticBillingEnabled: false,
    purchasedBalanceUsd: 0,
    freeUsageRemainingPercent: 100,
    freeModelIds: ["gemma4:31b"],
    maximumNewSpendEur: 0,
    ...overrides,
  };
  const response = {
    model: "gemma4:31b",
    done: true,
    done_reason: "stop",
    message: {
      role: "assistant",
      content: "",
      tool_calls: [{ function: { name: "submit_nona_proposal", arguments: proposal } }],
    },
    prompt_eval_count: 2000,
    prompt_eval_cached_count: 500,
    eval_count: 100,
  };
  const fetcher = vi.fn(async (url: string | URL | Request) =>
    String(url).endsWith("/tags")
      ? Response.json({ models: [{ name: "gemma4:31b", capabilities: ["completion", "tools"] }] })
      : Response.json(response),
  );
  const config = {
    enable: "ollama-free-test-v1",
    key,
    model: "gemma4:31b" as const,
    projectUrl: "https://mhhtnqfdkyudwyqlmnce.supabase.co",
    review,
    ledger,
    onMeasurement: (value: unknown) => measurements.push(value),
  };
  const input = conciergeRequestSchema.parse({
    slug: "synthetic",
    message: "Coucou",
    locale: "fr",
    requestId: crypto.randomUUID(),
    conversationId: crypto.randomUUID(),
  });
  return { config, fetcher, ledger, input, response, measurements };
}

it.each([
  { purchasedBalanceUsd: 1 },
  { paymentMethodAddedForRecipe: true },
  { paidUsageAvailable: true },
  { automaticBillingEnabled: true },
  { freePlanVerified: false },
  { maximumNewSpendEur: 1 },
  { freeModelIds: ["gpt-oss:20b"] },
  { freeUsageRemainingPercent: 0 },
  { expiresAt: new Date(Date.now() - 10000).toISOString() },
  { existingAccountTermsAccepted: false },
  { privacyReviewed: false },
])("makes no request without verified free-only account evidence: %j", (change) => {
  const s = setup(change);
  expect(createOllamaFreeDependencies(s.config, s.fetcher)).toBeUndefined();
  expect(s.fetcher).not.toHaveBeenCalled();
});

it("rejects unarmed, missing-key, wrong-key and non-TEST configuration before network access", () => {
  const s = setup();
  for (const change of [
    { enable: undefined },
    { key: undefined },
    { key: "foreign-key" },
    { projectUrl: "https://production.supabase.co" },
  ])
    expect(createOllamaFreeDependencies({ ...s.config, ...change }, s.fetcher)).toBeUndefined();
  expect(s.fetcher).not.toHaveBeenCalled();
});

it("requires reservation, a tool-capable catalogue entry, and successful durable admission", async () => {
  const s = setup();
  const d = createOllamaFreeDependencies(s.config, s.fetcher)!;
  await expect(d.propose("hello", "fr")).rejects.toThrow("reservation-required");
  s.fetcher.mockResolvedValueOnce(
    Response.json({ models: [{ name: "gemma4:31b", capabilities: ["completion"] }] }),
  );
  expect(await d.reserve(s.input, localGuide(), "a".repeat(64))).toBe(false);
  expect(s.ledger.reserve).not.toHaveBeenCalled();
  vi.mocked(s.ledger.reserve).mockResolvedValueOnce(false);
  expect(await d.reserve(s.input, localGuide(), "a".repeat(64))).toBe(false);
  expect(s.fetcher.mock.calls.every((c) => String(c[0]).endsWith("/tags"))).toBe(true);
});

it("makes one native tool proposal and measures tokens without claiming a measured account debit", async () => {
  const s = setup();
  const d = createOllamaFreeDependencies(s.config, s.fetcher)!;
  expect(await d.reserve(s.input, localGuide(), "a".repeat(64))).toBe(true);
  const value = await d.propose("synthetic context", "fr");
  expect(value).toMatchObject(proposal);
  expect(await d.reserve(s.input, localGuide(), "a".repeat(64))).toBe(false);
  await expect(d.propose("again", "fr")).rejects.toThrow("reservation-required");
  const call = s.fetcher.mock.calls.find((c) => String(c[0]).endsWith("/chat"))!;
  const init = (call as unknown as [string, RequestInit])[1];
  const body = JSON.parse(String(init.body));
  expect(body).toMatchObject({
    model: "gemma4:31b",
    stream: false,
    think: false,
    options: { num_predict: 800 },
  });
  expect(body).not.toHaveProperty("format");
  expect(body.tools).toHaveLength(1);
  expect(body.tools[0].function.name).toBe("submit_nona_proposal");
  expect(init.redirect).toBe("error");
  expect(await d.record!()).toMatchObject({
    state: "estimated",
    inputTokens: 2000,
    outputTokens: 100,
    usdNanos: 275000,
    eurMicros: null,
  });
  expect(s.measurements[0]).toMatchObject({
    retailEstimateUsd: 0.000275,
    actualAccountDebitUsd: null,
  });
});

it.each([
  "foreign-model",
  "foreign-tool",
  "multiple-tools",
  "plain-text",
  "truncated",
  "invalid-metrics",
])("fails closed on %s and keeps the reservation without a retry", async (kind) => {
  const s = setup();
  const d = createOllamaFreeDependencies(s.config, s.fetcher)!;
  await d.reserve(s.input, localGuide(), "a".repeat(64));
  const raw = structuredClone(s.response);
  if (kind === "foreign-model") raw.model = "unknown";
  if (kind === "foreign-tool") raw.message.tool_calls[0]!.function.name = "create_order";
  if (kind === "multiple-tools") raw.message.tool_calls.push(raw.message.tool_calls[0]!);
  if (kind === "plain-text") raw.message.tool_calls = [];
  if (kind === "truncated") raw.done_reason = "length";
  if (kind === "invalid-metrics") raw.prompt_eval_cached_count = 9000;
  s.fetcher.mockResolvedValueOnce(Response.json(raw));
  await expect(d.propose("synthetic", "fr")).rejects.toThrow("ollama-model-unavailable");
  const knownUsage = !["foreign-model", "invalid-metrics"].includes(kind);
  expect(await d.record!()).toMatchObject(
    knownUsage
      ? { state: "estimated", inputTokens: 2000, outputTokens: 100, usdNanos: 275000 }
      : { state: "uncertain", usdNanos: null },
  );
  expect(s.fetcher.mock.calls.filter((c) => String(c[0]).endsWith("/chat"))).toHaveLength(1);
});

it("falls back through the acquired engine on quota exhaustion, timeout or oversized responses", async () => {
  for (const failure of ["quota", "timeout", "large"]) {
    const s = setup();
    const d = createOllamaFreeDependencies(s.config, s.fetcher)!;
    s.fetcher.mockImplementationOnce(async () =>
      Response.json({ models: [{ name: "gemma4:31b", capabilities: ["completion", "tools"] }] }),
    );
    if (failure === "quota")
      s.fetcher.mockResolvedValueOnce(new Response("private", { status: 429 }));
    if (failure === "timeout") s.fetcher.mockRejectedValueOnce(new Error("private " + key));
    if (failure === "large") s.fetcher.mockResolvedValueOnce(new Response("x".repeat(65537)));
    const turn = await runConciergeModel(s.input, localGuide(), "a".repeat(64), d);
    expect(turn.mode).toBe("guided");
    expect(turn.usage.modelCalls).toBe(1);
    expect(JSON.stringify(turn)).not.toContain(key);
  }
});

it("reuses the real shared dialogue validator rather than accepting false confirmations", async () => {
  const s = setup();
  const d = createOllamaFreeDependencies(s.config, s.fetcher)!;
  s.response.message.tool_calls[0]!.function.arguments.dialogue.text =
    "C'est bien confirmé, j'ai réservé !";
  const turn = await runConciergeModel(s.input, localGuide(), "a".repeat(64), d);
  expect(turn.mode).toBe("guided");
  const prompt = modelContext(s.input, localGuide());
  expect(prompt).not.toContain("copyValue");
});

it("counts a reserved oversized prompt separately from a real network generation", async () => {
  const s = setup();
  const d = createOllamaFreeDependencies(s.config, s.fetcher)!;
  await d.reserve(s.input, localGuide(), "a".repeat(64));
  await expect(d.propose("x".repeat(12001), "fr")).rejects.toThrow("ollama-model-unavailable");
  await d.record!();
  expect(s.measurements[0]).toMatchObject({ networkRequests: 0, state: "uncertain" });
  expect(s.fetcher.mock.calls.filter((c) => String(c[0]).endsWith("/chat"))).toHaveLength(0);
});

it("never generates after the durable ledger refuses admission", async () => {
  const s = setup();
  vi.mocked(s.ledger.reserve).mockResolvedValue(false);
  const d = createOllamaFreeDependencies(s.config, s.fetcher)!;
  const turn = await runConciergeModel(s.input, localGuide(), "a".repeat(64), d);
  expect(turn.mode).toBe("guided");
  expect(turn.usage.modelCalls).toBe(0);
  expect(s.fetcher.mock.calls.filter((c) => String(c[0]).endsWith("/chat"))).toHaveLength(0);
  expect(s.ledger.record).not.toHaveBeenCalled();
});
