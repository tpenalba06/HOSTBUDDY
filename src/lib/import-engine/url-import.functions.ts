import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ImportSource, UrlImportOutcome } from "./types";

export const importFromUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ url: z.string().url().max(2000), source: z.string().max(20) }).parse(d),
  )
  .handler(async ({ data }): Promise<UrlImportOutcome> => {
    const { runUrlImport } = await import("./url-source.server");
    return runUrlImport({ url: data.url, source: data.source as ImportSource });
  });

export const demoImportFromAirbnbUrl = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ url: z.string().url().max(2000) }).parse(d))
  .handler(async ({ data }): Promise<UrlImportOutcome> => {
    const url = new URL(data.url);
    const isAirbnb = /(^|\.)airbnb\./i.test(url.hostname);
    const isRoom = /^\/rooms\/\d+(?:\/|$)/i.test(url.pathname);
    if (!isAirbnb || !isRoom) {
      return { ok: false, source: "airbnb", reason: "invalid" };
    }
    const { runUrlImport } = await import("./url-source.server");
    return runUrlImport({ url: url.toString(), source: "airbnb" });
  });

/** Authenticated, tenant protected copy of host-authorized photos into private media storage. */
export const importPropertyPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        propertyId: z.string().uuid(),
        sourceUrl: z.string().url().max(2000),
        urls: z.array(z.string().url().max(2000)).max(8),
        rightsConfirmed: z.literal(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const [{ UA, robotsAllows }, { safePublicFetch }, { propertyPhotoCandidates }] =
      await Promise.all([
        import("./url-source.server"),
        import("./safe-public-fetch"),
        import("./photo-candidates"),
      ]);
    const sb = context.supabase;
    const { data: property, error } = await sb
      .from("properties")
      .select("id,organization_id,source_url")
      .eq("id", data.propertyId)
      .single();
    if (error || !property || property.source_url !== data.sourceUrl)
      throw new Error("Logement introuvable.");
    const source = new URL(data.sourceUrl);
    if (!(await robotsAllows(source)))
      throw new Error("Import des photos non autorisé par la source.");
    const page = await safePublicFetch(
      source.href,
      { headers: { "user-agent": UA } },
      1_500_000,
      robotsAllows,
    );
    if (!page.response.ok || !(page.response.headers.get("content-type") ?? "").includes("html"))
      throw new Error("Import des photos indisponible. Ajoutez-les manuellement.");
    const allowed = propertyPhotoCandidates(new TextDecoder().decode(page.buffer), page.url);
    const { data: sections, error: sectionError } = await sb
      .from("guide_sections")
      .select("id")
      .eq("property_id", property.id)
      .like("section_key", "welcome%")
      .order("sort_order")
      .limit(1);
    if (sectionError || !sections?.[0]) throw new Error("Créez d’abord la rubrique Bienvenue.");
    let imported = 0;
    let failed = 0;
    for (const url of data.urls) {
      if (!allowed.includes(url)) {
        failed++;
        continue;
      }
      try {
        if (!(await robotsAllows(new URL(url)))) throw new Error("blocked");
        const file = await safePublicFetch(
          url,
          { headers: { "user-agent": UA, accept: "image/*" } },
          5 * 1024 * 1024,
          robotsAllows,
        );
        const mime = file.response.headers.get("content-type")?.split(";")[0];
        const ext = (
          {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "image/avif": "avif",
          } as Record<string, string>
        )[mime ?? ""];
        if (!file.response.ok || !ext) throw new Error("image");
        const path = `${property.organization_id}/${property.id}/${sections[0].id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await sb.storage
          .from("guide-media")
          .upload(path, file.buffer, { contentType: mime!, upsert: false });
        if (uploadError) throw uploadError;
        const { error: insertError } = await sb.from("section_media").insert({
          organization_id: property.organization_id,
          property_id: property.id,
          section_id: sections[0].id,
          media_type: "image",
          storage_path: path,
          mime_type: mime!,
          file_size: file.buffer.length,
          sort_order: imported,
        });
        if (insertError) {
          await sb.storage.from("guide-media").remove([path]);
          throw insertError;
        }
        imported++;
      } catch {
        failed++;
      }
    }
    return { imported, failed };
  });
