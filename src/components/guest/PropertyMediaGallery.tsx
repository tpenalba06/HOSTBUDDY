import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { PublicSection } from "@/lib/data/public-guide.functions";
import { resolvePropertyMedia } from "./property-media";

/** Uses published, signed property media only. No sample photos in real guides. */
export function PropertyMediaGallery({ sections }: { sections: PublicSection[] }) {
  const { t } = useI18n();
  const { gallery, video } = resolvePropertyMedia(sections);
  const [active, setActive] = useState<string | null>(null);
  const selected = gallery.find((item) => item.id === active);
  if (gallery.length <= 1 && !video) return null;
  return (
    <section className="hb-property-media" aria-label={t("media.heading")}>
      {gallery.length > 1 && (
        <div className="hb-property-gallery" aria-label={t("media.photos")}>
          {gallery.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              aria-label={`${t("media.viewPhoto")} ${index + 1}${item.altText ? ` : ${item.altText}` : ""}`}
            >
              <img src={item.url!} alt={item.altText ?? ""} loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {video && (
        <figure className="hb-presentation-video">
          <video
            controls
            playsInline
            preload="metadata"
            src={video.url!}
            poster={video.posterUrl ?? undefined}
            aria-label={t("media.presentation")}
          />
          <figcaption>{video.caption || t("media.discover")}</figcaption>
        </figure>
      )}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="hb-guide hb-photo-dialog">
          <DialogTitle>{selected?.caption || selected?.altText || t("media.photo")}</DialogTitle>
          {selected && <img src={selected.url!} alt={selected.altText ?? ""} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}
