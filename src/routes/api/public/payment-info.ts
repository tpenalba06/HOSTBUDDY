import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { readPublicJson } from "@/lib/public-json";
export const Route = createFileRoute("/api/public/payment-info")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const data = z
          .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
          .safeParse(await readPublicJson(request));
        if (!data.success) return Response.json({ error: "invalid_request" }, { status: 400 });
        try {
          const { paymentSummary } = await import("@/lib/integrations/payments.server");
          return Response.json(await paymentSummary(data.data.token), {
            headers: { "cache-control": "no-store" },
          });
        } catch {
          return Response.json({ error: "payment_unavailable" }, { status: 404 });
        }
      },
    },
  },
});
