import { expect, it } from "vitest";
import {
  estimateConciergeMonth,
  maximumAttemptEurMicros,
  NONA_ATTEMPT_EUR_MICROS,
  observeUsage,
  reviewedBilling,
} from "./concierge-metering.server";
import { conciergeIdentity } from "./concierge-identity.server";

const now = Date.parse("2026-10-19T10:00:00Z");
const key = "a".repeat(64);
const review = () => ({
  version: "nona-prepaid-review-v1",
  keySha256: key,
  evidenceSha256: "b".repeat(64),
  reviewedAt: "2026-10-19T09:00:00Z",
  expiresAt: "2026-10-19T12:00:00Z",
  autoTopupDisabled: true,
  byokDisabled: true,
  chargeableExtrasDisabled: true,
  privacyReviewed: true,
  eurMicrosPerUsdCeiling: 1_500_000,
  scope: "test",
  totalAuthorizedEurMicros: 5_000_000,
});

it("requires a dated matching billing review; a key, balance or boolean flag is no evidence", () => {
  expect(reviewedBilling(review(), key, "test", now)).not.toBeNull();
  for (const value of [
    true,
    {},
    { ...review(), autoTopupDisabled: false },
    { ...review(), keySha256: "c".repeat(64) },
    { ...review(), totalAuthorizedEurMicros: 5_000_001 },
    { ...review(), eurMicrosPerUsdCeiling: 2_000_001 },
    { ...review(), expiresAt: "2026-10-18T12:00:00Z" },
  ])
    expect(reviewedBilling(value, key, "test", now)).toBeNull();
  expect(reviewedBilling(review(), key, "monthly", now)).toBeNull();
});
it("reserves more than the complete bounded attempt at the reviewed worst conversion", () => {
  expect(maximumAttemptEurMicros(2_000_000)).toBe(8089);
  expect(maximumAttemptEurMicros(2_000_000)).toBeLessThan(NONA_ATTEMPT_EUR_MICROS);
  expect(() => maximumAttemptEurMicros(NaN)).toThrow();
});
it("distinguishes provider billing from estimates and uncertain attempts, rounding upward", () => {
  const r = { eurMicrosPerUsdCeiling: 1_500_000 };
  const estimate = observeUsage({ inputTokens: 2500, outputTokens: 180, latencyMs: 321.2 }, r);
  expect(estimate).toMatchObject({
    state: "estimated",
    usdNanos: 340000,
    eurMicros: 510,
    latencyMs: 322,
  });
  expect(
    observeUsage(
      { inputTokens: 2500, outputTokens: 180, providerCostUsd: 0.000301, latencyMs: 300 },
      r,
    ),
  ).toMatchObject({ state: "measured", eurMicros: 452 });
  for (const values of [
    {},
    { inputTokens: 50_000, outputTokens: 1 },
    { inputTokens: 1, outputTokens: 801 },
    { inputTokens: 10, outputTokens: 10, cacheWriteTokens: 1 },
    { inputTokens: 10, outputTokens: 10, providerCostUsd: NaN },
  ])
    expect(observeUsage({ ...values, latencyMs: 200 }, r).state).toBe("uncertain");
});
it("exposes its adoption assumptions rather than estimating from housing count alone", () => {
  expect(estimateConciergeMonth(10)).toEqual({
    properties: 10,
    conversations: 200,
    calls: 1200,
    usd: 0.708,
  });
  expect(estimateConciergeMonth(1000).usd).toBe(70.8);
});
it("uses signed anonymous visitors and independent trusted-network buckets", () => {
  const secret = "s".repeat(32),
    origin = "https://nona.example/api/public/concierge";
  const a = conciergeIdentity(
    new Request(origin, { headers: { "cf-connecting-ip": "192.0.2.1" } }),
    secret,
    "cloudflare",
  )!;
  expect(a.setCookie).toMatch(/HttpOnly; Secure; SameSite=Strict/);
  const cookie = a.setCookie!.split(";")[0]!;
  const b = conciergeIdentity(
    new Request(origin, { headers: { cookie, "cf-connecting-ip": "192.0.2.2" } }),
    secret,
    "cloudflare",
  )!;
  expect(b.visitorHash).toBe(a.visitorHash);
  expect(b.networkHash).not.toBe(a.networkHash);
  expect(b.setCookie).toBeUndefined();
  const forged = conciergeIdentity(
    new Request(origin, { headers: { cookie: cookie.replace(/.$/, "z") } }),
    secret,
    "cloudflare",
  )!;
  expect(forged.visitorHash).not.toBe(a.visitorHash);
  const untrusted = (ip: string) =>
    conciergeIdentity(
      new Request(origin, { headers: { "cf-connecting-ip": ip } }),
      secret,
      undefined,
    )!.networkHash;
  expect(untrusted("192.0.2.1")).toBe(untrusted("192.0.2.2"));
  expect(conciergeIdentity(new Request(origin), undefined, undefined)).toBeUndefined();
});
