import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/billing-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleBillingSyncRequest } =
          await import("@/lib/integrations/billing-sync-handler.server");
        return handleBillingSyncRequest(request, async () => {
          const { syncPendingBilling } = await import("@/lib/integrations/payments.server");
          return syncPendingBilling();
        });
      },
    },
  },
});
