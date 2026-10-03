import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GuestGuide, type SectionId } from "@/components/guest/GuestGuide";
import { getVillaMare } from "@/components/guest/villaMare";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/guide-preview")({
  head: () => ({
    meta: [{ title: "Guide voyageur V2 — HostBuddy" }, { name: "robots", content: "noindex" }],
  }),
  component: GuidePreview,
});

function GuidePreview() {
  const { locale, t } = useI18n();
  const [section, setSection] = useState<SectionId>("welcome");
  return (
    <main className="hb-guide">
      <p className="hb-preview-notice">{t("guide.previewNotice")}</p>
      <GuestGuide data={getVillaMare(locale)} section={section} onSection={setSection} />
    </main>
  );
}
