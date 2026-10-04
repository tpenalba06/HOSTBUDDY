import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("stripe-signature");
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        const connectSecret = process.env["STRIPE_CONNECT_WEBHOOK_SECRET"];
        if (!signature || !secret) return new Response("Unavailable", { status: 400 });
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
        const { stripeClient, handleStripeEvent } =
          await import("@/lib/integrations/payments.server");
        let stripe;
        try {
          stripe = stripeClient();
        } catch {
          return new Response("Unavailable", { status: 503 });
        }
        let event;
        try {
          event = await stripe.webhooks.constructEventAsync(raw, signature, secret);
        } catch {
          try {
            if (!connectSecret) throw new Error();
            event = await stripe.webhooks.constructEventAsync(raw, signature, connectSecret);
          } catch {
            return new Response("Invalid signature", { status: 400 });
          }
        }
        try {
          await handleStripeEvent(event);
          return Response.json({ received: true });
        } catch {
          return new Response("Retry later", { status: 503 });
        }
      },
    },
  },
});
