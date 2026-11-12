import { useState } from "react";
import type { GuideData } from "./villaMare";
import type { GuideSection, SectionMedia } from "@/lib/data/properties";
import { useI18n } from "@/lib/i18n";
import { GuideView } from "./GuideView";
import { createVillaMare, demoGuide } from "@/components/demo/villa-mare-fixture";
export const SECTIONS = [
  { id: "arrival", key: "section.arrival", icon: "🔑" },
  { id: "house", key: "section.house", icon: "🏡" },
  { id: "wifi", key: "section.wifi", icon: "📶" },
  { id: "places", key: "section.places", icon: "📍" },
  { id: "services", key: "section.services", icon: "✨" },
  { id: "departure", key: "section.departure", icon: "🧳" },
  { id: "pool", key: "section.pool", icon: "🏊" },
  { id: "contact", key: "section.contact", icon: "💬" },
] as const;
export type SectionId = "welcome" | (typeof SECTIONS)[number]["id"];
export function GuestGuide({
  data,
  section,
  onSection,
  heroImage,
  labels,
  visibleSections,
  sections,
  media = [],
}: {
  data: GuideData;
  section: SectionId;
  onSection: (section: SectionId) => void;
  heroImage?: string;
  labels?: Partial<Record<(typeof SECTIONS)[number]["id"], string>>;
  visibleSections?: SectionId[];
  sections?: GuideSection[];
  media?: SectionMedia[];
}) {
  const { t, locale } = useI18n();
  const [requested, setRequested] = useState(false);
  const property = createVillaMare(locale, data);
  if (sections) {
    property.sections = sections;
    property.media = media;
  }
  if (heroImage) property.coverUrl = heroImage;
  if (visibleSections)
    property.sections = property.sections.filter((item) =>
      visibleSections.includes(item.section_key as SectionId),
    );
  if (labels)
    property.sections = property.sections.map((item) => ({
      ...item,
      title: labels[item.section_key as keyof typeof labels] ?? item.title,
    }));
  return (
    <>
      <GuideView
        guide={demoGuide(property)}
        sectionKey={section === "welcome" ? null : section}
        onSectionChange={(key) => {
          setRequested(false);
          onSection((key ?? "welcome") as SectionId);
        }}
        onRequest={() => setRequested(true)}
        onFeedback={() => setRequested(true)}
      />
      {requested && (
        <div className="hb-guide">
          <p className="hb-empty" role="status">
            {t("guide.demoRequest")}
          </p>
        </div>
      )}
    </>
  );
}
