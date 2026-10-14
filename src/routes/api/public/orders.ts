import { readPublicJson } from "@/lib/public-json";
import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { serviceBookingRequest } from "@/lib/service-booking";

export const Route = createFileRoute("/api/public/orders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = serviceBookingRequest.safeParse(await readPublicJson(request));
        if (!parsed.success)
          return Response.json({ error: "Vérifiez votre demande." }, { status: 400 });
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for") ??
          "unknown";
        const fingerprint = createHash("sha256")
          .update(`${ip}|${request.headers.get("user-agent") ?? ""}|${parsed.data.slug}`)
          .digest("hex");
        const { supabaseAdmin: client } = await import("@/integrations/supabase/client.server");
        if (!parsed.data.revision) {
          // Preserve the acquired legacy request until the additive catalogue
          // migration is applied; no new options/slots are accepted in this path.
          const capabilities = await client
            .from("services")
            .select("booking_config")
            .eq("id", parsed.data.serviceId)
            .maybeSingle();
          if (!capabilities.error || !["42703", "PGRST204"].includes(capabilities.error.code))
            return Response.json({ error: "service_quote_changed" }, { status: 409 });
          if (parsed.data.optionId || parsed.data.details)
            return Response.json({ error: "service_configuration_unavailable" }, { status: 409 });
          const old = await client.rpc("submit_guest_order", {
            _slug: parsed.data.slug,
            _service: parsed.data.serviceId,
            _name: parsed.data.name,
            _contact: parsed.data.contact,
            _quantity: parsed.data.quantity,
            _requested_for: parsed.data.requestedFor ?? new Date().toISOString(),
            _fingerprint: fingerprint,
            _website: parsed.data.website,
          });
          if (old.error || !old.data)
            return Response.json({ error: "booking_unavailable" }, { status: 400 });
          const quote = await client
            .from("orders")
            .select("id,total_amount,status")
            .eq("id", old.data)
            .single();
          if (quote.error) return Response.json({ error: "booking_unavailable" }, { status: 503 });
          return Response.json(
            {
              ok: true,
              legacy: true,
              booking: {
                id: quote.data.id,
                amount: Number(quote.data.total_amount),
                status: quote.data.status,
              },
            },
            { headers: { "cache-control": "no-store" } },
          );
        }
        const { data: booking, error } = await client.rpc("submit_service_booking", {
          _slug: parsed.data.slug,
          _service: parsed.data.serviceId,
          _name: parsed.data.name,
          _contact: parsed.data.contact,
          _quantity: parsed.data.quantity,
          _requested_for: parsed.data.requestedFor ?? null,
          _request_id: parsed.data.requestId,
          _receipt_hash: createHash("sha256").update(parsed.data.receiptToken).digest("hex"),
          _option: parsed.data.optionId ?? null,
          _details: parsed.data.details,
          _terms: parsed.data.termsAccepted,
          _revision: parsed.data.revision,
          _fingerprint: fingerprint,
        });
        if (error)
          return Response.json(
            {
              error: error.message.includes("rate limited")
                ? "Trop de demandes. Réessayez plus tard."
                : "La demande n’a pas pu être envoyée.",
            },
            { status: error.message.includes("rate limited") ? 429 : 400 },
          );
        return Response.json({ ok: true, booking }, { headers: { "cache-control": "no-store" } });
      },
    },
  },
});
