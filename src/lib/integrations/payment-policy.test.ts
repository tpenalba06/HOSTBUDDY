import { describe, it, expect } from "vitest";
import { subscriptionQuote, cents, paymentState, paymentEnvironment } from "./payment-policy";
import Stripe from "stripe";
describe("payment safety", () => {
  it("prices 3 included properties and additional units on the server", () => {
    expect(subscriptionQuote(0).monthlyCents).toBe(999);
    expect(subscriptionQuote(3).monthlyCents).toBe(999);
    expect(subscriptionQuote(5)).toEqual({ extraQuantity: 2, monthlyCents: 1597 });
    expect(() => subscriptionQuote(-1)).toThrow();
  });
  it("rejects invalid or free checkout amounts", () => {
    expect(cents("29.99")).toBe(2999);
    for (const amount of [0, -1, NaN, Infinity]) expect(() => cents(amount)).toThrow();
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
