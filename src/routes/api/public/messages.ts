import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const schema = z.object({
  slug: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(80),
  contact: z.string().trim().max(160).optional().default(""),
  message: z.string().trim().min(1).max(2000),
  website: z.string().max(0).optional().default(""),
});

export const Route = createFileRoute("/api/public/messages")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = schema.safeParse(await request.json().catch(() => null));
        if (!parsed.success)
          return Response.json({ error: "Vérifiez votre message." }, { status: 400 });
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for") ??
          "unknown";
        const fingerprint = createHash("sha256")
          .update(`${ip}|${request.headers.get("user-agent") ?? ""}|${parsed.data.slug}`)
          .digest("hex");
        const client = createClient<Database>(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_PUBLISHABLE_KEY"]!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
        const { error } = await client.rpc("submit_guest_message", {
          _slug: parsed.data.slug,
          _name: parsed.data.name,
          _contact: parsed.data.contact,
          _body: parsed.data.message,
          _fingerprint: fingerprint,
          _website: parsed.data.website,
        });
        if (error)
          return Response.json(
            {
              error: error.message.includes("rate limited")
                ? "Trop de messages ont été envoyés. Réessayez plus tard."
                : "Le message n’a pas pu être envoyé.",
            },
            { status: error.message.includes("rate limited") ? 429 : 400 },
          );
        return Response.json({ ok: true });
      },
    },
  },
});
