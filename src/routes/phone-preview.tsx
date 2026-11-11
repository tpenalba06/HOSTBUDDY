import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { GuideView } from "@/components/guest/GuideView";
import { NonaConcierge } from "@/components/guest/NonaConcierge";
import { createVillaMare, demoGuide } from "@/components/demo/villa-mare-fixture";
import { LOCALES, useI18n, type Locale } from "@/lib/i18n";

import { publicPreviewSchema, type PublicImportPreview } from "@/lib/import-engine/public-preview";
import { SECTION_VISUALS } from "@/components/guest/visual-library";
import type { PublicSection } from "@/lib/data/public-guide.functions";
import type { GuideViewData } from "@/components/guest/guide-model";

export const Route = createFileRoute("/phone-preview")({
  validateSearch: (search: Record<string, unknown>): { lang: Locale } => ({
    lang: LOCALES.includes(search["lang"] as Locale) ? (search["lang"] as Locale) : "fr",
  }),
  head: () => ({ meta: [{ title: "Villa Mare — NONA" }, { name: "robots", content: "noindex" }] }),
  component: PhonePreview,
});

function PhonePreview() {
  const { lang } = Route.useSearch();
  const { locale, setLocale, t } = useI18n();
  const initialized = useRef<Locale | null>(null);
  useEffect(() => {
    if (initialized.current !== lang) {
      initialized.current = lang;
      setLocale(lang);
    }
  }, [lang, setLocale]);
  const [preview, setPreview] = useState<PublicImportPreview | null>(null);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        event.data?.type !== "nona-import-preview"
      )
        return;
      const result = publicPreviewSchema.nullable().safeParse(event.data.preview);
      if (result.success) setPreview(result.data);
    };
    window.addEventListener("message", receive);
    if (window.parent !== window)
      window.parent.postMessage("nona-phone-ready", window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, []);
  const fr = locale === "fr";
  const amenityLabels = fr
    ? {
        kitchen: "Cuisine",
        laundry: "Lave-linge",
        parking: "Parking",
        climate: "Climatisation",
        heating: "Chauffage",
        television: "Télévision",
        pool: "Piscine",
      }
    : {
        kitchen: "Kitchen",
        laundry: "Washing machine",
        parking: "Parking",
        climate: "Air conditioning",
        heating: "Heating",
        television: "Television",
        pool: "Pool",
      };
  const ruleLabels = fr
    ? { noSmoking: "Logement non-fumeur", noParties: "Fêtes interdites" }
    : { noSmoking: "No smoking", noParties: "No parties" };
  const illustration = (key: string): NonNullable<PublicSection["media"]> => {
    const url = SECTION_VISUALS[key];
    return url
      ? [
          {
            id: `illustration-${key}`,
            type: "image",
            path: url,
            url,
            mimeType: "image/webp",
            sortOrder: 0,
            caption: fr ? "Image illustrative" : "Illustrative image",
            altText: fr ? "Image illustrative" : "Illustrative image",
          },
        ]
      : [];
  };
  const guide: GuideViewData = preview
    ? {
        id: "import-preview",
        name: preview.name ?? (fr ? "Votre logement" : "Your property"),
        originalLocale: locale,
        coverUrl:
          preview.illustration === "villa-sea"
            ? "/demo-guide/coast.webp"
            : `/hostbuddy-media/${preview.illustration ?? "apartment"}.webp`,
        subtitle: fr
          ? "Image d’illustration · Informations à vérifier"
          : "Illustration · Details to review",
        sections: [
          {
            id: "arrival",
            key: "arrival",
            title: t("section.arrival"),
            media: illustration("arrival"),
            content: { items: preview.arrival ? [{ label: "", text: preview.arrival }] : [] },
          },
          {
            id: "wifi",
            key: "wifi",
            title: t("section.wifi"),
            content: { items: [] },
            media: illustration("wifi"),
          },
          {
            id: "departure",
            key: "departure",
            title: t("section.departure"),
            content: { items: preview.departure ? [{ label: "", text: preview.departure }] : [] },
          },
          {
            id: "address",
            key: "address",
            title: fr ? "Adresse" : "Address",
            content: { items: [] },
          },
          {
            id: "access",
            key: "access",
            title: fr ? "Accès et clés" : "Access and keys",
            content: { items: [] },
          },
          {
            id: "house",
            key: "house",
            title: t("section.house"),
            content: {
              items: preview.capacity
                ? [
                    {
                      label: fr ? "Capacité" : "Capacity",
                      text: fr ? `${preview.capacity} voyageur(s)` : `${preview.capacity} guest(s)`,
                    },
                  ]
                : [],
            },
          },
          ...(preview.amenities?.length
            ? [
                {
                  id: "amenities",
                  key: "amenities",
                  title: t("section.amenities"),
                  content: {
                    items: preview.amenities.map((key) => ({
                      label: "",
                      text: amenityLabels[key],
                    })),
                  },
                  media: illustration("house"),
                },
              ]
            : []),
          ...(preview.rules?.length
            ? [
                {
                  id: "rules",
                  key: "rules",
                  title: t("section.rules"),
                  content: {
                    items: preview.rules.map((key) => ({ label: "", text: ruleLabels[key] })),
                  },
                },
              ]
            : []),
          { id: "services", key: "services", title: t("section.services"), content: { items: [] } },
        ],
      }
    : demoGuide(createVillaMare(locale));
  return (
    <div className="nona-phone-document">
      <GuideView
        key={preview ? JSON.stringify(preview) : "villa"}
        guide={guide}
        importPreview={!!preview}
      />
      {!preview && <NonaConcierge guide={guide} demo />}
    </div>
  );
}
