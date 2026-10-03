import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { PublicGuide, PublicSection } from "@/lib/data/public-guide.functions";
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: "fr", t: (key: string) => key }) }));
vi.mock("@/components/i18n/LanguageSelect", () => ({ LanguageSelect: () => null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: new Proxy(
    {},
    {
      get() {
        throw new Error("Guide presentation must not access Supabase");
      },
    },
  ),
}));
import { GuideView } from "./GuideView";
import { guideCover, localizedSections, sectionEntries } from "./guide-model";
import { toPublicSections } from "./guide-adapters";
import type { GuideSection, SectionMedia } from "@/lib/data/properties";

const section: PublicSection = {
  id: "wifi",
  key: "wifi",
  title: "Wi-Fi",
  content: { items: [{ label: "Wi-Fi", text: "Réseau Maison / mot de passe secret" }] },
};
const guide: PublicGuide = {
  id: "real-property",
  name: "Maison réelle",
  originalLocale: "fr",
  sections: [section],
};
describe("shared guest guide compatibility", () => {
  it("renders the property without borrowing fixture photographs or personal details", () => {
    const html = renderToStaticMarkup(<GuideView guide={guide} />);
    expect(html).toContain("Maison réelle");
    expect(html).not.toContain("<img");
    expect(html).not.toMatch(/Villa Mare|soleil2026|breakfast|arrival.jpg|spa.jpg/);
    expect(guideCover(guide)).toBeUndefined();
  });
  it("keeps a legacy combined Wi-Fi value intact without fabricating a separate password", () => {
    const html = renderToStaticMarkup(<GuideView guide={guide} sectionKey="wifi" />);
    expect(html).toContain("Réseau Maison / mot de passe secret");
    expect(html).not.toContain("guest.wifiPassword");
    expect(html).toContain("guest.copy");
  });
  it("preserves custom sections, their full text, video and captions", () => {
    const custom: PublicSection = {
      id: "custom",
      key: "custom-owner",
      title: "Informations particulières",
      content: { items: [{ label: "Consigne", text: "Texte existant intégral" }] },
      media: [
        {
          id: "v",
          type: "video",
          path: "org/property/v",
          url: "https://media.example/video",
          mimeType: "video/mp4",
          sortOrder: 0,
        },
      ],
    };
    const html = renderToStaticMarkup(
      <GuideView guide={{ ...guide, sections: [custom] }} sectionKey={custom.key} />,
    );
    expect(html).toContain("Texte existant intégral");
    expect(html).toContain("<video");
    expect(html).toContain("controls");
  });
  it("retains rich entries and legacy text while rejecting unsafe action URLs", () => {
    const places: PublicSection = {
      id: "p",
      key: "places",
      title: "Adresses",
      content: {
        items: [{ label: "Adresse existante", text: "Description existante" }],
        entries: [
          {
            title: "Adresse ajoutée",
            text: "Nouveau contenu",
            mapUrl: "javascript:alert(1)",
            mediaIds: ["photo", "123"],
          },
        ],
      },
    };
    const entries = sectionEntries(places);
    expect(entries.map((item) => item.title)).toEqual(["Adresse ajoutée", "Adresse existante"]);
    expect(entries[0]?.mapUrl).toBeUndefined();
    expect(entries[0]?.mediaIds).toEqual(["photo", "123"]);
  });
  it("uses valid translations and falls back to original content when stale", () => {
    const translated = {
      ...section,
      translations: [
        {
          locale: "en",
          title: "Wi-Fi English",
          content: { items: [{ label: "Network", text: "Original network" }] },
          sourceType: "human" as const,
          isStale: false,
        },
      ],
    };
    expect(localizedSections({ ...guide, sections: [translated] }, "en")[0]?.title).toBe(
      "Wi-Fi English",
    );
    translated.translations[0]!.isStale = true;
    expect(localizedSections({ ...guide, sections: [translated] }, "en")[0]?.title).toBe("Wi-Fi");
  });
  it("keeps real service requests and original textual content without stock photographs", () => {
    const serviceGuide = {
      ...guide,
      sections: [
        {
          ...section,
          key: "services",
          title: "Services",
          content: { items: [{ label: "Conditions", text: "Sur réservation" }] },
        },
      ],
      services: [
        {
          id: "s",
          name: "Petit déjeuner réel",
          description: "Description réelle",
          price: 20,
          pricingType: "fixed" as const,
        },
      ],
    };
    const html = renderToStaticMarkup(
      <GuideView guide={serviceGuide} sectionKey="services" onRequest={() => {}} />,
    );
    expect(html).toContain("Petit déjeuner réel");
    expect(html).toContain("Sur réservation");
    expect(html).toContain("guest.request");
    expect(html).not.toContain("<img");
  });
  it("adapts isolated previews without hiding custom sections or leaking invisible sections", () => {
    const raw = [
      {
        id: "b",
        section_key: "custom-b",
        title: "Custom",
        sort_order: 2,
        is_visible: true,
        content: { items: [{ label: "", text: "Conservé" }] },
      },
      {
        id: "a",
        section_key: "wifi",
        title: "Wi-Fi",
        sort_order: 1,
        is_visible: true,
        content: section.content,
      },
      {
        id: "hidden",
        section_key: "contact",
        title: "Privé",
        sort_order: 0,
        is_visible: false,
        content: { items: [] },
      },
    ] as GuideSection[];
    const media = [
      {
        id: "m",
        section_id: "b",
        media_type: "image",
        storage_path: "blob:local-demo",
        sort_order: 0,
        mime_type: "image/jpeg",
        caption: "Légende",
        alt_text: "Image locale",
      },
    ] as SectionMedia[];
    const converted = toPublicSections(raw, media);
    expect(converted.map((item) => item.key)).toEqual(["wifi", "custom-b"]);
    expect(converted[1]?.media?.[0]?.caption).toBe("Légende");
    expect(raw[0]?.id).toBe("b");
  });
});
