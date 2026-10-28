import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleStripeWebhookRequest } =
          await import("@/lib/integrations/stripe-webhook-handler.server");
        return handleStripeWebhookRequest(request);
      },
    },
  },
});
