import type Stripe from "stripe";

/** The subscription and Connect endpoints can be configured independently. */
export async function verifyStripeWebhook(
  stripe: Pick<Stripe, "webhooks">,
  raw: string,
  signature: string,
  secrets: { platform?: string | undefined; connect?: string | undefined },
) {
  for (const [scope, secret] of Object.entries(secrets)) {
    if (!secret) continue;
    try {
      const event = await stripe.webhooks.constructEventAsync(raw, signature, secret);
      if ((scope === "connect") !== !!event.account) continue;
      return event;
    } catch {
      // Try the other configured endpoint without exposing signature details.
    }
  }
  throw new Error("invalid_signature");
}
