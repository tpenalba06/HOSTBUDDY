import type { GuideSection, SectionMedia } from "@/lib/data/properties";
import type { PublicSection } from "@/lib/data/public-guide.functions";
import { readGuideContent } from "@/lib/data/guide-content";

/** Demo object URLs only. Production signs private media through its existing server loader. */
export function toPublicSections(sections: GuideSection[], media: SectionMedia[]): PublicSection[] {
  return sections
    .filter((section) => section.is_visible)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((section) => ({
      id: section.id,
      key: section.section_key,
      title: section.title,
      icon: section.icon ?? undefined,
      ctaLabel: section.cta_label,
      content: readGuideContent(section.content),
      media: media
        .filter((item) => item.section_id === section.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => ({
          id: item.id,
          type: item.media_type as "image" | "video",
          path: item.storage_path,
          url: item.storage_path,
          mimeType: item.mime_type,
          caption: item.caption,
          altText: item.alt_text,
          sortOrder: item.sort_order,
        })),
    }));
}
