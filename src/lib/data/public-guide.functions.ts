import type { VideoMetadata } from "@/lib/media/video-policy";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { setResponseHeader } from "@tanstack/react-start/server";
import { reportOperationalEvent } from "@/lib/operational-events.server";
import { resolvePublishedMedia } from "./published-media.server";
import type { PropertyMediaConfig } from "@/components/guest/property-media";
import type { Database } from "@/integrations/supabase/types";

export interface PublicSection {
  id: string;
  key: string;
  icon?: string;
  title: string;
  ctaLabel?: string | null;
  content: {
    propertyMedia?: PropertyMediaConfig;
    mediaMetadata?: Record<string, VideoMetadata>;
    explicitlyEnabled?: boolean;
    items?: { label: string; text: string }[];
    entries?: {
      id?: string;
      title: string;
      text?: string;
      category?: string;
      address?: string;
      phone?: string;
      mapUrl?: string;
      mediaIds?: string[];
    }[];
    phones?: string[];
    emails?: string[];
  };
  translations?: {
    locale: string;
    title: string;
    content: PublicSection["content"];
    sourceType: "machine" | "human";
    isStale: boolean;
  }[];
  media?: {
    id: string;
    type: "image" | "video";
    path: string;
    url?: string | null;
    mimeType: string;
    caption?: string | null;
    altText?: string | null;
    sortOrder: number;
    sizeBytes?: number;
    durationSeconds?: number;
    processingStatus?: "uploaded" | "processing" | "ready" | "failed";
    posterUrl?: string;
    revision?: string;
  }[];
}
export interface PublicGuide {
  id: string;
  name: string;
  originalLocale: string;
  accommodationType?: string | null;
  messagingEnabled?: boolean;
  sections: PublicSection[];
  services?: {
    id: string;
    name: string;
    description: string;
    price: number;
    pricingType: "fixed" | "per_person";
    imagePath?: string | null;
  }[];
  review?: {
    title: string;
    message: string;
    destinations: { label: string; url: string }[];
  } | null;
}

// Public read path: only the security-definer RPC (published + visible only).
export const getPublicGuide = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data }): Promise<PublicGuide | null> => {
    const sb = createClient<Database>(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      },
    );
    const started = performance.now();
    const { data: guide, error } = await sb.rpc("get_public_guide", { _slug: data.slug });
    if (error) {
      reportOperationalEvent("guide_snapshot_failed");
      throw new Error("unavailable");
    }
    const result = (guide as unknown as PublicGuide | null) ?? null;
    if (!result) return null;
    const snapshotMs = performance.now() - started;
    const mediaStarted = performance.now();
    const resolved = await resolvePublishedMedia(result, async (paths) => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      return supabaseAdmin.storage.from("guide-media").createSignedUrls(paths, 3600);
    });
    // Fixed numeric timings only. No property identifiers, paths or exceptions.
    setResponseHeader(
      "Server-Timing",
      `guide_snapshot;dur=${snapshotMs.toFixed(1)}, guide_media;dur=${(performance.now() - mediaStarted).toFixed(1)}`,
    );
    return resolved;
  });
