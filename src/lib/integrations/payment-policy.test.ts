import { describe, it, expect } from "vitest";
import {
  subscriptionQuote,
  cents,
  paymentState,
  paymentEnvironment,
  serviceFeeCents,
} from "./payment-policy";
import Stripe from "stripe";
describe("payment safety", () => {
  it("makes one property free and prices two included properties", () => {
    for (const [count, expected] of [
      [0, 0],
      [1, 0],
      [2, 999],
      [3, 1298],
      [5, 1896],
      [10, 3391],
    ])
      expect(subscriptionQuote(count!).monthlyCents).toBe(expected);
    expect(subscriptionQuote(5).extraQuantity).toBe(3);
    for (const n of [-1, 1.5, NaN, Infinity]) expect(() => subscriptionQuote(n)).toThrow();
  });
  it("rounds the separate 2% platform fee in integer cents", () => {
    for (const [amount, fee] of [
      [1500, 30],
      [5000, 100],
      [10000, 200],
      [1299, 26],
      [50, 1],
    ])
      expect(serviceFeeCents(amount!)).toBe(fee);
    for (const amount of [0, 49, NaN, 1500.5]) expect(() => serviceFeeCents(amount)).toThrow();
  });
  it("rejects invalid or free checkout amounts", () => {
    expect(cents("29.99")).toBe(2999);
    for (const amount of [0, -1, NaN, Infinity, 0.001, 0.49]) expect(() => cents(amount)).toThrow();
    expect(cents(0.5)).toBe(50);
  });
  it("does not regress paid or refunded payments on delayed events", () => {
    expect(paymentState("paid", "expired")).toBe("paid");
    expect(paymentState("refunded", "paid")).toBe("refunded");
    expect(paymentState("pending", "paid")).toBe("paid");
  });
  it("keeps live charges disabled until explicitly verified", () => {
    expect(paymentEnvironment({ STRIPE_SECRET_KEY: "sk_live_synthetic" }).enabled).toBe(false);
    expect(paymentEnvironment({ STRIPE_SECRET_KEY: "sk_test_synthetic" }).mode).toBe("test");
    expect(paymentEnvironment({}).enabled).toBe(false);
  });
  it("verifies the signed raw payload with the official SDK and rejects tampering", async () => {
    const stripe = new Stripe("sk_test_synthetic");
    const payload = JSON.stringify({
      id: "evt_synthetic",
      type: "checkout.session.completed",
      data: { object: {} },
    });
    const secret = "whsec_synthetic_not_a_real_secret";
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect((await stripe.webhooks.constructEventAsync(payload, signature, secret)).id).toBe(
      "evt_synthetic",
    );
    await expect(
      stripe.webhooks.constructEventAsync(payload + " ", signature, secret),
    ).rejects.toThrow();
  });
});
