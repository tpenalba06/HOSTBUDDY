import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export interface PublicSection {
  id: string;
  key: string;
  icon?: string;
  title: string;
  ctaLabel?: string | null;
  content: { items?: { label: string; text: string }[]; phones?: string[]; emails?: string[] };
  translations?: { locale: string; title: string; content: PublicSection["content"]; sourceType: "machine" | "human"; isStale: boolean }[];
  media?: { id: string; type: "image" | "video"; path: string; url?: string | null; mimeType: string; caption?: string | null; altText?: string | null; sortOrder: number }[];
}
export interface PublicGuide {
  id: string;
  name: string;
  originalLocale: string;
  accommodationType?: string | null;
  messagingEnabled?: boolean;
  sections: PublicSection[];
  services?: { id: string; name: string; description: string; price: number; pricingType: "fixed" | "per_person"; imagePath?: string | null }[];
  review?: { title: string; message: string; destinations: { label: string; url: string }[] } | null;
}

// Public read path: only the security-definer RPC (published + visible only).
export const getPublicGuide = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data }): Promise<PublicGuide | null> => {
    const sb = createClient<Database>(process.env['SUPABASE_URL']!, process.env['SUPABASE_PUBLISHABLE_KEY']!, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data: guide, error } = await sb.rpc("get_public_guide", { _slug: data.slug });
    if (error) { console.error(error); throw new Error("unavailable"); }
    const result = (guide as unknown as PublicGuide | null) ?? null;
    if (!result) return null;
    const paths = result.sections.flatMap((section) => section.media?.map((item) => item.path) ?? []);
    if (paths.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: signed } = await supabaseAdmin.storage.from("guide-media").createSignedUrls(paths, 3600);
      const urls = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));
      result.sections = result.sections.map((section) => section.media ? ({ ...section, media: section.media.map((item) => ({ ...item, url: urls.get(item.path) ?? null })) }) : section);
    }
    return result;
  });
