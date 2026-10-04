import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
export const Route = createFileRoute("/api/billing-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["BILLING_SYNC_SECRET"];
        const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
        if (
          !secret ||
          Buffer.byteLength(token) !== Buffer.byteLength(secret) ||
          !timingSafeEqual(Buffer.from(token), Buffer.from(secret))
        )
          return new Response(null, { status: 401 });
        try {
          const { syncPendingBilling } = await import("@/lib/integrations/payments.server");
          const result = await syncPendingBilling();
          return Response.json(result, { status: result.pending ? 503 : 200 });
        } catch {
          return Response.json({ error: "billing_sync_unavailable" }, { status: 503 });
        }
      },
    },
  },
});
