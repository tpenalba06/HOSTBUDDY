import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { GuestGuide, type SectionId } from "@/components/guest/GuestGuide";
import { getVillaMare } from "@/components/guest/villaMare";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/guide-preview")({
  validateSearch: (search: Record<string, unknown>): { device?: "mobile" | "desktop" } =>
    search["device"] === "mobile" ? { device: "mobile" } : {},
  head: () => ({
    meta: [
      { title: "Aperçu du guide voyageur — NONA" },
      {
        name: "description",
        content: "Découvrez la présentation du guide voyageur NONA pour Villa Mare.",
      },
      { property: "og:title", content: "Aperçu du guide voyageur — NONA" },
      {
        property: "og:description",
        content: "Découvrez la présentation du guide voyageur NONA pour Villa Mare.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GuidePreview,
});

function GuidePreview() {
  const { locale, t } = useI18n();
  const [section, setSection] = useState<SectionId>("welcome");
  const { device } = Route.useSearch();
  return (
    <div className="hb-preview-workspace">
      <nav className="hb-preview-devices" aria-label="Format de l’aperçu">
        <span>Guide V2 · consolidation UX</span>
        <Link
          to="/guide-preview"
          search={{ device: "mobile" }}
          aria-current={device === "mobile" ? "page" : undefined}
        >
          Mobile
        </Link>
        <Link
          to="/guide-preview"
          search={{}}
          aria-current={device !== "mobile" ? "page" : undefined}
        >
          Desktop
        </Link>
      </nav>
      <main className={`hb-guide ${device === "mobile" ? "hb-device-mobile" : ""}`}>
        <p className="hb-preview-notice">{t("guide.previewNotice")}</p>
        <GuestGuide data={getVillaMare(locale)} section={section} onSection={setSection} />
      </main>
    </div>
  );
}
