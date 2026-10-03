import { useState } from "react";
import type { GuideData } from "./villaMare";
import type { GuideSection, SectionMedia } from "@/lib/data/properties";
import type { PublicSection } from "@/lib/data/public-guide.functions";
import { useI18n } from "@/lib/i18n";
import { GuideView } from "./GuideView";
import { toPublicSections } from "./guide-adapters";
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
  heroImage = "/demo-guide/coast.webp",
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
  const fallback: PublicSection[] = SECTIONS.filter(
    (item) =>
      (!visibleSections || visibleSections.includes(item.id)) &&
      (item.id !== "pool" || data.pool) &&
      (item.id !== "places" || data.places.length) &&
      (item.id !== "services" || data.services.length),
  ).map((item) => ({
    id: item.id,
    key: item.id,
    title: labels?.[item.id] ?? t(item.key),
    content:
      item.id === "wifi"
        ? {
            items: [
              { label: t("guest.network"), text: data.wifi.network },
              { label: t("guest.wifiPassword"), text: data.wifi.password },
            ],
          }
        : item.id === "places"
          ? { items: data.places.map((place) => ({ label: place.name, text: place.note })) }
          : item.id === "contact"
            ? {
                items: [
                  { label: data.host, text: [data.phone, data.email].filter(Boolean).join("\n") },
                ],
                phones: data.phone ? [data.phone] : [],
                emails: data.email ? [data.email] : [],
              }
            : {
                items:
                  item.id === "services"
                    ? []
                    : [
                        {
                          label: "",
                          text: data[item.id as "arrival" | "house" | "pool" | "departure"] ?? "",
                        },
                      ],
              },
  }));
  const actual = sections
    ? toPublicSections(sections, media).map((item) => {
        const base = fallback.find((base) => base.key === item.key);
        // The original Villa Mare fixture keeps its recommendations outside sections.
        return item.key === "places" && !item.content.items?.length && base
          ? { ...item, content: base.content }
          : item;
      })
    : fallback;
  const demoPhotos: Record<string, string> = {
    arrival: "/hostbuddy-media/arrival.webp",
    wifi: "/hostbuddy-media/wifi.webp",
    house: "/demo-guide/house.webp",
    places: "/demo-guide/restaurant.webp",
    departure: "/hostbuddy-media/departure.webp",
    contact: "/hostbuddy-media/contact.webp",
    pool: "/demo-guide/pool.webp",
    services: "/demo-guide/breakfast.webp",
  };
  const illustrated = actual.map((item) =>
    item.media?.length || !demoPhotos[item.key]
      ? item
      : {
          ...item,
          media: [
            {
              id: `demo-photo-${item.key}`,
              type: "image" as const,
              path: demoPhotos[item.key]!,
              url: demoPhotos[item.key]!,
              mimeType: "image/jpeg",
              sortOrder: 0,
            },
          ],
        },
  );
  if (!sections) {
    const places = illustrated.find((item) => item.key === "places");
    if (places) {
      const photos = [
        "/demo-guide/coast.webp",
        "/demo-guide/breakfast.webp",
        "/demo-guide/restaurant.webp",
      ];
      places.content = {
        entries: data.places.map((place, index) => ({
          id: `demo-place-${index}`,
          title: place.name,
          text: place.note,
          category:
            {
              fr: ["Plages", "Commerces", "Restaurants"],
              en: ["Beaches", "Shops", "Restaurants"],
              es: ["Playas", "Tiendas", "Restaurantes"],
              de: ["Strände", "Geschäfte", "Restaurants"],
              it: ["Spiagge", "Negozi", "Ristoranti"],
              pt: ["Praias", "Lojas", "Restaurantes"],
            }[locale][index] ?? "",
          mediaIds:
            index === 2
              ? ["demo-place-photo-2", "demo-place-photo-0", "demo-place-photo-1"]
              : [`demo-place-photo-${index}`],
        })),
      };
      places.media = photos.map((url, index) => ({
        id: `demo-place-photo-${index}`,
        type: "image",
        path: url,
        url,
        mimeType: "image/webp",
        sortOrder: index,
      }));
    }
  }
  return (
    <>
      <GuideView
        guide={{
          id: "demo",
          name: data.name,
          subtitle: data.host,
          originalLocale: "fr",
          coverUrl: heroImage,
          sections: illustrated,
          services: data.services.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.desc,
            price: item.price,
            pricingType: "fixed",
          })),
        }}
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
