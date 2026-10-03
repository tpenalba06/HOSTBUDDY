import { readPublicJson } from "@/lib/public-json";
import { createFileRoute } from "@tanstack/react-router";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
const schema = z.object({
  action: z.enum(["send", "read"]).default("send"),
  slug: z.string().min(1).max(80),
  name: z.string().trim().max(80).default(""),
  contact: z.string().trim().max(255).default(""),
  message: z.string().trim().max(2000).default(""),
  website: z.string().max(0).default(""),
  conversationId: z.string().uuid().optional(),
  token: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .optional(),
});
export const Route = createFileRoute("/api/public/messages")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const headers = { "cache-control": "no-store" };
        if (Number(request.headers.get("content-length")) > 16384)
          return Response.json({ error: "invalid input" }, { status: 413, headers });
        const parsed = schema.safeParse(await readPublicJson(request));
        if (!parsed.success)
          return Response.json({ error: "invalid input" }, { status: 400, headers });
        const input = parsed.data;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for") ??
          "unknown";
        const fingerprint = createHash("sha256")
          .update(`${ip}|${request.headers.get("user-agent") ?? ""}|${input.slug}`)
          .digest("hex");
        if (input.action === "read") {
          if (!input.token || !input.conversationId)
            return Response.json({ error: "unavailable" }, { status: 404, headers });
          const result = await supabaseAdmin.rpc("read_guest_thread", {
            _slug: input.slug,
            _conversation: input.conversationId,
            _token_hash: tokenHash(input.token),
          });
          if (result.error || !result.data)
            return Response.json({ error: "unavailable" }, { status: 404, headers });
          return Response.json({ thread: result.data }, { headers });
        }
        if (!input.message || (!input.conversationId && !input.name))
          return Response.json({ error: "invalid input" }, { status: 400, headers });
        if (input.conversationId) {
          if (!input.token)
            return Response.json({ error: "unavailable" }, { status: 404, headers });
          const result = await supabaseAdmin.rpc("continue_guest_thread", {
            _slug: input.slug,
            _conversation: input.conversationId,
            _token_hash: tokenHash(input.token),
            _body: input.message,
            _fingerprint: fingerprint,
          });
          if (result.error)
            return Response.json(
              { error: "unavailable" },
              { status: result.error.message.includes("rate limited") ? 429 : 400, headers },
            );
          return Response.json({ ok: true }, { headers });
        }
        const token = randomBytes(32).toString("hex");
        const result = await supabaseAdmin.rpc("open_guest_thread", {
          _slug: input.slug,
          _name: input.name,
          _contact: input.contact,
          _body: input.message,
          _fingerprint: fingerprint,
          _token_hash: tokenHash(token),
        });
        if (result.error)
          return Response.json(
            { error: "unavailable" },
            { status: result.error.message.includes("rate limited") ? 429 : 400, headers },
          );
        return Response.json({ ok: true, session: { id: result.data, token } }, { headers });
      },
    },
  },
});
