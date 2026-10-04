export const HOSTBUDDY_PLAN = {
  baseCents: 999,
  includedProperties: 3,
  extraCents: 299,
  currency: "eur",
} as const;
export function subscriptionQuote(propertyCount: number) {
  if (!Number.isSafeInteger(propertyCount) || propertyCount < 0) throw new Error("invalid_count");
  const extraQuantity = Math.max(0, propertyCount - HOSTBUDDY_PLAN.includedProperties);
  return {
    extraQuantity,
    monthlyCents: HOSTBUDDY_PLAN.baseCents + extraQuantity * HOSTBUDDY_PLAN.extraCents,
  };
}
export function cents(value: number | string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > 999999) throw new Error("invalid_amount");
  return Math.round(number * 100);
}
export function paymentState(current: string, incoming: string) {
  if (current === "refunded") return current;
  if (["refunded", "partially_refunded"].includes(current) && incoming === "paid") return current;
  if (
    ["paid", "refunded", "partially_refunded"].includes(current) &&
    ["pending", "failed", "expired"].includes(incoming)
  )
    return current;
  return incoming;
}
export function paymentEnvironment(env: Record<string, string | undefined>) {
  const key = env["STRIPE_SECRET_KEY"];
  const mode = key?.startsWith("sk_test_")
    ? "test"
    : key?.startsWith("sk_live_")
      ? "live"
      : "unconfigured";
  const enabled = mode === "test" || (mode === "live" && env["STRIPE_LIVE_VERIFIED"] === "true");
  return {
    mode,
    enabled,
    billing:
      enabled &&
      !!env["STRIPE_PRICE_BASE"] &&
      !!env["STRIPE_PRICE_EXTRA"] &&
      !!env["STRIPE_WEBHOOK_SECRET"],
    connect: enabled && !!env["STRIPE_CONNECT_WEBHOOK_SECRET"],
  };
}
