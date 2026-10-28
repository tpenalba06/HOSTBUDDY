import type { PublicGuide } from "./public-guide.functions";
import { reportOperationalEvent } from "@/lib/operational-events.server";

type SignedMedia = { path?: string | null; signedUrl?: string | null; error?: unknown };
type Sign = (paths: string[]) => Promise<{ data: SignedMedia[] | null; error?: unknown }>;

// Even an owner-authored snapshot must not turn the service-role signer into
// an oracle for another property's private objects. No table reads are added.
function belongsToGuide(path: string, propertyId: string) {
  const parts = path.split("/");
  return (
    parts.length === 4 &&
    parts[1] === propertyId &&
    parts.every((part) => !!part && part !== "." && part !== ".." && !/[\\%?#\s]/.test(part))
  );
}

/** One deduplicated Storage request for section AND service media. */
export async function resolvePublishedMedia(guide: PublicGuide, sign: Sign): Promise<PublicGuide> {
  const requested = [
    ...guide.sections.flatMap((section) => section.media?.map((item) => item.path) ?? []),
    ...(guide.services ?? []).flatMap((service) => (service.imagePath ? [service.imagePath] : [])),
  ];
  const paths = [...new Set(requested.filter((path) => belongsToGuide(path, guide.id)))];
  const urls = new Map<string, string>();
  let failed = paths.length !== new Set(requested).size;
  if (paths.length) {
    try {
      const result = await sign(paths);
      failed ||= !!result.error;
      for (const item of result.data ?? []) {
        if (item.path && paths.includes(item.path) && item.signedUrl && !item.error)
          urls.set(item.path, item.signedUrl);
      }
      failed ||= urls.size !== paths.length;
    } catch {
      failed = true;
    }
  }
  if (failed) reportOperationalEvent("guide_media_signing_failed");
  return {
    ...guide,
    ...(guide.services
      ? {
          services: guide.services.map((service) => ({
            ...service,
            imagePath: service.imagePath ? (urls.get(service.imagePath) ?? null) : null,
          })),
        }
      : {}),
    sections: guide.sections.map((section) => ({
      ...section,
      ...(section.media
        ? {
            media: section.media.map((item) => ({
              ...item,
              ...(section.content.mediaMetadata?.[item.id] ?? {}),
              url: urls.get(item.path) ?? null,
            })),
          }
        : {}),
    })),
  };
}
