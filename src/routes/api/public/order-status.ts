import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";
import { z } from "zod";
import { readPublicJson } from "@/lib/public-json";
export const Route = createFileRoute("/api/public/order-status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const result = z
          .object({
            orderId: z.string().uuid().optional(),
            requestId: z.string().uuid().optional(),
            token: z.string().regex(/^[a-f0-9]{64}$/),
          })
          .refine((value) => value.orderId || value.requestId)
          .safeParse(await readPublicJson(request));
        if (!result.success) return Response.json({ error: "invalid_request" }, { status: 400 });
        const { supabaseAdmin } = await import("@/lib/service-database-client.server");
        const hash = createHash("sha256").update(result.data.token).digest("hex");
        const { data, error } = result.data.orderId
          ? await supabaseAdmin.rpc("read_service_booking", {
              _order: result.data.orderId,
              _receipt_hash: hash,
            })
          : await supabaseAdmin.rpc("read_service_booking_request", {
              _request: result.data.requestId!,
              _receipt_hash: hash,
            });
        if (error || !data)
          return Response.json(
            { error: "booking_unavailable" },
            { status: 404, headers: { "cache-control": "no-store" } },
          );
        return Response.json(data, { headers: { "cache-control": "no-store" } });
      },
    },
  },
});
