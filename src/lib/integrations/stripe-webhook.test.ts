import { describe, expect, it } from "vitest";
import Stripe from "stripe";
import { verifyStripeWebhook } from "./stripe-webhook.server";

describe("Stripe endpoint signatures", () => {
  const stripe = new Stripe("sk_test_synthetic");
  const platform = "whsec_synthetic_platform";
  const connect = "whsec_synthetic_connect";
  const signed = (account?: string, secret = connect) => {
    const raw = JSON.stringify({
      id: "evt_synthetic",
      type: "checkout.session.completed",
      ...(account ? { account } : {}),
      data: { object: {} },
    });
    return { raw, signature: stripe.webhooks.generateTestHeaderString({ payload: raw, secret }) };
  };
  it("accepts a Connect payment without subscription configuration", async () => {
    const { raw, signature } = signed("acct_host");
    expect((await verifyStripeWebhook(stripe, raw, signature, { connect })).account).toBe(
      "acct_host",
    );
  });
  it("accepts subscription events independently", async () => {
    const { raw, signature } = signed(undefined, platform);
    expect((await verifyStripeWebhook(stripe, raw, signature, { platform })).id).toBe(
      "evt_synthetic",
    );
  });
  it("rejects a signature from the wrong endpoint scope", async () => {
    const { raw, signature } = signed("acct_host", platform);
    await expect(
      verifyStripeWebhook(stripe, raw, signature, { platform, connect }),
    ).rejects.toThrow();
  });
  it("rejects modified payloads and missing secrets", async () => {
    const { raw, signature } = signed("acct_host");
    await expect(verifyStripeWebhook(stripe, raw + " ", signature, { connect })).rejects.toThrow();
    await expect(verifyStripeWebhook(stripe, raw, signature, {})).rejects.toThrow();
  });
});
