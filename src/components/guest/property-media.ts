import type { PublicSection } from "@/lib/data/public-guide.functions";

export const MEDIA_LIMITS = {
  videoSourceBytes: 50 * 1024 * 1024,
  videoDurationSeconds: 90,
  videoOfflineBytes: 20 * 1024 * 1024,
  guideOfflineBytes: 50 * 1024 * 1024,
} as const;
export type PropertyMedia = NonNullable<PublicSection["media"]>[number];
export type AccommodationMood =
  "villa-sea" | "urban-hotel" | "chalet" | "glamping" | "apartment" | "countryside";
/** Stored in the existing welcome section JSON; IDs refer only to that section's media.
 * URLs are resolved by the published-guide loader, never persisted in this config. */
export interface PropertyMediaConfig {
  version: 1;
  coverId?: string;
  galleryIds?: string[];
  presentationVideoId?: string | null;
  essentialIds?: string[];
  fallback?: { assetId: string; mood: AccommodationMood };
}
export interface AmbienceAsset {
  id: string;
  mood: AccommodationMood;
  url: string;
  alt: string;
  licenseReference: string;
}
/** Deterministic suggestion only: ambiguous input stays unclassified for human review. */
export function detectAccommodationMood(text: string): AccommodationMood | undefined {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const matches: AccommodationMood[] = [];
  if (/\b(villa|maison)\b/.test(normalized) && /\b(mer|plage|coast|sea)\b/.test(normalized))
    matches.push("villa-sea");
  if (/\b(hotel|hotelier)\b/.test(normalized) && /\b(ville|urbain|centre|city)\b/.test(normalized))
    matches.push("urban-hotel");
  if (/\bchalet\b/.test(normalized)) matches.push("chalet");
  if (/\b(glamping|yourte|tente)\b/.test(normalized)) matches.push("glamping");
  if (/\b(appartement|studio|apartment)\b/.test(normalized)) matches.push("apartment");
  if (/\b(campagne|ferme|rural|campagnard)\b/.test(normalized)) matches.push("countryside");
  return matches.length === 1 ? matches[0] : undefined;
}
export function resolvePropertyMedia(sections: PublicSection[], catalogue: AmbienceAsset[] = []) {
  const welcome = sections.find((section) => section.key.split("-")[0] === "welcome");
  const raw = welcome?.content.propertyMedia;
  const config = raw?.version === 1 ? raw : undefined;
  const media = [...(welcome?.media ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const images = media.filter((item) => item.type === "image" && item.url);
  const cover = images.find((item) => item.id === config?.coverId) ?? images[0];
  const byId = new Map(images.map((item) => [item.id, item]));
  const ordered = [...new Set(Array.isArray(config?.galleryIds) ? config.galleryIds : [])].flatMap(
    (id) => (byId.has(id) ? [byId.get(id)!] : []),
  );
  const gallery = [...ordered, ...images.filter((item) => !ordered.includes(item))];
  const videos = media.filter((item) => item.type === "video" && item.url);
  const presentation =
    config?.presentationVideoId === null
      ? undefined
      : (videos.find((item) => item.id === config?.presentationVideoId) ?? videos[0]);
  const video =
    presentation?.processingStatus && presentation.processingStatus !== "ready"
      ? undefined
      : presentation;
  const fallback = !cover
    ? catalogue.find((item) => item.id === config?.fallback?.assetId && item.licenseReference)
    : undefined;
  return { cover, gallery, video, fallback };
}
/** Readiness gate for a future verified offline download; no success from mere metadata. */
export function offlineMediaBudget(media: PropertyMedia[]) {
  let bytes = 0;
  for (const item of media) {
    if (!item.url || !Number.isFinite(item.sizeBytes) || !item.sizeBytes || item.sizeBytes < 0)
      return { ready: false, reason: "metadata" as const };
    if (
      item.type === "video" &&
      (item.processingStatus !== "ready" ||
        !item.durationSeconds ||
        !Number.isFinite(item.durationSeconds) ||
        item.durationSeconds < 0 ||
        item.durationSeconds > MEDIA_LIMITS.videoDurationSeconds ||
        item.sizeBytes > MEDIA_LIMITS.videoOfflineBytes)
    )
      return { ready: false, reason: "video" as const };
    bytes += item.sizeBytes;
  }
  return bytes > MEDIA_LIMITS.guideOfflineBytes
    ? { ready: false, reason: "size" as const }
    : { ready: true, bytes };
}
