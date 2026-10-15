import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { conciergeRequestSchema } from "./concierge";
import { runConciergeModel } from "./concierge-model.server";
import type { PublicGuide } from "./data/public-guide.functions";
import type { Database } from "@/integrations/supabase/types";
import { readPublicJson } from "./public-json";
import { resolvePublishedMedia } from "./data/published-media.server";

// Bounded per-isolate throttle, not a distributed billable-model quota. No paid
// provider can be enabled by an environment flag in this version.
const buckets = new Map<string, { at: number; count: number }>();
export function admitConcierge(key: string, now = Date.now()) {
  const current = buckets.get(key);
  if (current && now - current.at < 60000) {
    if (current.count >= 20) return false;
    current.count++;
    return true;
  }
  if (buckets.size >= 4096)
    for (const [id, bucket] of buckets) if (now - bucket.at >= 60000) buckets.delete(id);
  if (buckets.size >= 4096) return false;
  buckets.set(key, { at: now, count: 1 });
  return true;
}
export async function conciergeResponse(request: Request) {
  const headers = { "cache-control": "no-store", "referrer-policy": "no-referrer" };
  const parsed = conciergeRequestSchema.safeParse(await readPublicJson(request, 12288));
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400, headers });
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0] ??
    "unknown";
  const fingerprint = createHash("sha256").update(`${ip}|${parsed.data.slug}`).digest("hex");
  if (!admitConcierge(fingerprint))
    return Response.json(
      { error: "rate_limited" },
      { status: 429, headers: { ...headers, "retry-after": "60" } },
    );
  try {
    const client = createClient<Database>(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await client.rpc("get_public_guide", { _slug: parsed.data.slug });
    if (error) throw new Error("unavailable");
    if (!data) return Response.json({ error: "guide_unavailable" }, { status: 404, headers });
    const guide = data as unknown as PublicGuide;
    const turn = await runConciergeModel(parsed.data, guide, fingerprint);
    // Reuse the same property-scoped media signer as the public guide. No media
    // URL, service ID or facts supplied by the browser/provider are trusted.
    const resolved = await resolvePublishedMedia(
      {
        ...guide,
        sections: guide.sections.filter(
          (s) => s.key.split("-")[0] === "places" && turn.places.length > 0,
        ),
        services: turn.services,
      },
      async (paths) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        return supabaseAdmin.storage.from("guide-media").createSignedUrls(paths, 900);
      },
    );
    const places = turn.places.map((place) => {
      const section = resolved.sections.find((s) =>
        (s.content.entries ?? []).some((e) => e.title === place.title),
      );
      const entry = section?.content.entries?.find((e) => e.title === place.title);
      const image = section?.media?.find(
        (m) => m.type === "image" && entry?.mediaIds?.includes(m.id),
      )?.url;
      return { ...place, ...(image ? { image } : {}) };
    });
    return Response.json({ ...turn, places, services: resolved.services ?? [] }, { headers });
  } catch {
    return Response.json({ error: "concierge_unavailable" }, { status: 503, headers });
  }
}
