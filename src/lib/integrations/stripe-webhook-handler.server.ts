import { reportOperationalEvent } from "../operational-events.server";

export async function handleStripeWebhookRequest(request: Request): Promise<Response> {
  const signature = request.headers.get("stripe-signature");
  const { paymentServerEnvironment } =
    await import("@/lib/integrations/payment-environment.server");
  const env = paymentServerEnvironment(request);
  const secret = env["STRIPE_WEBHOOK_SECRET"];
  const connectSecret = env["STRIPE_CONNECT_WEBHOOK_SECRET"];
  if (!signature || (!secret && !connectSecret))
    return new Response("Unavailable", { status: 400 });
  const reader = request.body?.getReader();
  if (!reader) return new Response("Invalid", { status: 400 });
  let raw = "";
  let size = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.byteLength;
      if (size > 512_000) return new Response("Too large", { status: 413 });
      raw += decoder.decode(item.value, { stream: true });
    }
    raw += decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
  }
  const { stripeClient, handleStripeEvent } = await import("@/lib/integrations/payments.server");
  let stripe;
  try {
    stripe = stripeClient();
  } catch {
    reportOperationalEvent("stripe_webhook_unavailable");
    return new Response("Unavailable", { status: 503 });
  }
  let event;
  try {
    const { verifyStripeWebhook } = await import("@/lib/integrations/stripe-webhook.server");
    event = await verifyStripeWebhook(stripe, raw, signature, {
      platform: secret,
      connect: connectSecret,
    });
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  const key = env["STRIPE_SECRET_KEY"];
  if (
    !key ||
    (!key.startsWith("sk_test_") && !key.startsWith("sk_live_")) ||
    event.livemode !== key.startsWith("sk_live_")
  ) {
    reportOperationalEvent("stripe_webhook_mode_mismatch");
    return new Response("Invalid mode", { status: 400 });
  }
  try {
    await handleStripeEvent(event);
    return Response.json({ received: true });
  } catch {
    reportOperationalEvent("stripe_webhook_failed");
    return new Response("Retry later", { status: 503 });
  }
}
