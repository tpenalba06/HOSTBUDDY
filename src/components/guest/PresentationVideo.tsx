import { useI18n } from "@/lib/i18n";
import type { PropertyMedia } from "./property-media";

/** Shared inline player: natural ratio, bounded portrait height, no sound autoplay. */
export function PresentationVideo({ video }: { video: PropertyMedia | undefined }) {
  const { t } = useI18n();
  if (!video?.url) return null;
  return (
    <figure className="hb-presentation-video" data-presentation-video>
      <video
        controls
        playsInline
        preload="metadata"
        src={video.url}
        poster={video.posterUrl}
        aria-label={t("media.presentation")}
      />
      {video.caption && <figcaption>{video.caption}</figcaption>}
    </figure>
  );
}
