import { z } from "zod";
import { readPublicJson } from "./public-json";

const requestSchema = z
  .object({
    slug: z.string().min(1).max(80),
    token: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();

export async function guestStayResponse(request: Request) {
  const headers = {
    "cache-control": "private, no-store",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  };
  if (
    request.headers.get("origin") !== new URL(request.url).origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return Response.json({ error: "unavailable" }, { status: 403, headers });

  const input = requestSchema.safeParse(await readPublicJson(request, 512));
  if (!input.success) return Response.json({ error: "unavailable" }, { status: 400, headers });

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("read_guest_stay_access", {
      _slug: input.data.slug,
      _token: input.data.token,
    });
    if (error) throw new Error("unavailable");
    if (!data) return Response.json({ error: "unavailable" }, { status: 404, headers });
    return Response.json(data, { headers });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503, headers });
  }
}
