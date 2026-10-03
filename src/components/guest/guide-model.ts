import type { PublicGuide, PublicSection } from "@/lib/data/public-guide.functions";

import { ambienceFor } from "./visual-library";
import { resolvePropertyMedia } from "./property-media";

export type GuideViewData = PublicGuide & { coverUrl?: string; subtitle?: string };
export type GuideEntry = {
  id: string;
  title: string;
  text: string;
  category?: string | undefined;
  address?: string | undefined;
  phone?: string | undefined;
  mapUrl?: string | undefined;
  mediaIds?: string[];
};
export const sectionKind = (key: string) => key.split("-")[0] ?? key;
export const cleanTitle = (title: string) => title.replace(/^[^\p{L}\p{N}]+/u, "");
export function safeWebUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}
export function sectionEntries(section: PublicSection): GuideEntry[] {
  const content = section.content as PublicSection["content"] & { entries?: unknown };
  const legacy = (content.items ?? []).map((item, index) => ({
    id: `legacy-${index}`,
    title: item.label || item.text.split("\n")[0] || section.title,
    text: item.label ? item.text : item.text.split("\n").slice(1).join("\n"),
  }));
  if (!Array.isArray(content.entries)) return legacy;
  const entries = content.entries.flatMap((value, index): GuideEntry[] => {
    if (!value || typeof value !== "object") return [];
    const item = value as Record<string, unknown>;
    const str = (key: string) =>
      typeof item[key] === "string" ? (item[key] as string) : undefined;
    const title = str("title");
    if (!title) return [];
    return [
      {
        id: str("id") || `entry-${index}`,
        title,
        text: str("text") || "",
        category: str("category"),
        address: str("address"),
        phone: str("phone"),
        mapUrl: safeWebUrl(str("mapUrl")),
        mediaIds: Array.isArray(item["mediaIds"])
          ? item["mediaIds"].filter((id): id is string => typeof id === "string")
          : [],
      },
    ];
  });
  // Existing text remains available even when richer entries are added later.
  return [...entries, ...legacy];
}
export function guideCover(guide: GuideViewData) {
  return (
    resolvePropertyMedia(guide.sections).cover?.url ||
    guide.coverUrl ||
    guide.sections
      .find((section) => sectionKind(section.key) === "welcome")
      ?.media?.find((item) => item.type === "image" && item.url)?.url ||
    ambienceFor(
      `${guide.name} ${guide.sections
        .flatMap((section) => section.content.items ?? [])
        .map((item) => item.text)
        .join(" ")}`,
    )
  );
}
export function localizedSections(guide: GuideViewData, locale: string) {
  return guide.sections
    .filter((section) => {
      if (
        !["pool", "parking", "climate", "contact", "amenities"].includes(
          sectionKind(section.key),
        ) ||
        section.content.explicitlyEnabled
      )
        return true;
      return !!(
        section.content.items?.some((item) => item.text.trim()) ||
        section.content.entries?.length ||
        section.media?.length ||
        section.content.phones?.length ||
        section.content.emails?.length
      );
    })
    .map((section) => {
      const translated = section.translations?.find(
        (item) => item.locale === locale && !item.isStale,
      );
      return translated
        ? { ...section, title: translated.title, content: translated.content }
        : section;
    });
}
