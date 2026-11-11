import { DemoServiceBooking } from "@/components/demo/DemoServiceBooking";
import { readBookingConfig } from "@/lib/service-booking";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { GuideView } from "@/components/guest/GuideView";
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
  const [photos, setPhotos] = useState<string[]>([]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        event.data?.type !== "nona-import-preview"
      )
        return;
      const result = publicPreviewSchema.nullable().safeParse(event.data.preview);
      if (result.success) {
        setPreview(result.data);
        const prefix = `blob:${window.location.origin}/`;
        const urls: unknown = event.data.photos;
        setPhotos(
          result.data && Array.isArray(urls)
            ? urls
                .filter((url): url is string => typeof url === "string" && url.startsWith(prefix))
                .slice(0, 6)
            : [],
        );
      }
    };
    window.addEventListener("message", receive);
    if (window.parent !== window)
      window.parent.postMessage("nona-phone-ready", window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, []);
  return <PhoneGuide key={JSON.stringify(preview)} preview={preview} photos={photos} />;
}

function PhoneGuide({
  preview,
  photos,
}: {
  preview: PublicImportPreview | null;
  photos: string[];
}) {
  const { locale, t } = useI18n();
  const [serviceId, setServiceId] = useState<string | null>(null);
  const fr = locale === "fr";
  const text = preview?.text;
  const items = (...values: (string | undefined)[]) =>
    values.filter((value): value is string => !!value).map((value) => ({ label: "", text: value }));
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
          ...(text?.description
            ? [
                {
                  id: "welcome",
                  key: "welcome",
                  title: t("section.welcome"),
                  content: { items: items(text.description) },
                },
              ]
            : []),
          {
            id: "arrival",
            key: "arrival",
            title: t("section.arrival"),
            media: illustration("arrival"),
            content: { items: items(text?.arrival ?? preview.arrival) },
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
            content: { items: items(text?.departure ?? preview.departure, text?.trash) },
          },
          {
            id: "address",
            key: "address",
            title: fr ? "Adresse" : "Address",
            content: {
              items: items(
                text?.address ??
                  (preview.locality
                    ? `${fr ? "Localité indiquée par la source" : "Locality from source"} · ${preview.locality}`
                    : undefined),
              ),
            },
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
          ...(preview.amenities?.length || text?.equipment || text?.kitchen || text?.parking
            ? [
                {
                  id: "amenities",
                  key: "amenities",
                  title: t("section.amenities"),
                  content: {
                    items: [
                      ...items(text?.equipment, text?.kitchen, text?.parking),
                      ...(preview.amenities ?? []).map((key) => ({
                        label: "",
                        text: amenityLabels[key],
                      })),
                    ],
                  },
                  media: illustration("house"),
                },
              ]
            : []),
          ...(preview.rules?.length || text?.rules
            ? [
                {
                  id: "rules",
                  key: "rules",
                  title: t("section.rules"),
                  content: {
                    items: [
                      ...items(text?.rules),
                      ...(preview.rules ?? []).map((key) => ({ label: "", text: ruleLabels[key] })),
                    ],
                  },
                },
              ]
            : []),
          ...(preview.places?.length
            ? [
                {
                  id: "places",
                  key: "places",
                  title: t("section.places"),
                  content: {
                    entries: preview.places.map((title, i) => ({
                      id: String(i),
                      title,
                      text: fr
                        ? "Recommandation issue du livret source"
                        : "Recommendation from the source guide",
                    })),
                  },
                },
              ]
            : []),
          { id: "services", key: "services", title: t("section.services"), content: { items: [] } },
        ],
      }
    : demoGuide(createVillaMare(locale));
  if (preview && photos.length) {
    const welcome = guide.sections.find((section) => section.key === "welcome") ?? {
      id: "welcome",
      key: "welcome",
      title: t("section.welcome"),
      content: {},
    };
    const media = photos.map((url, index) => ({
      id: `owner-photo-${index}`,
      type: "image" as const,
      path: url,
      url,
      mimeType: "image/*",
      sortOrder: index,
      caption: fr ? "Photo fournie par le propriétaire" : "Owner-provided photo",
    }));
    guide.sections = [
      { ...welcome, media },
      ...guide.sections.filter((section) => section.key !== "welcome"),
    ];
    guide.coverUrl = photos[0]!;
    if (preview.locality) guide.subtitle = preview.locality;
    else delete guide.subtitle;
  }
  guide.services = [
    [
      "Petit-déjeuner",
      "Breakfast",
      "Viennoiseries, jus et boisson chaude · 15 € par personne",
      15,
      "per_person",
      "/demo-guide/breakfast.webp",
      ["Classique", "Végétarien"],
    ],
    [
      "Transfert",
      "Transfer",
      "Trajet fictif · 35 € par trajet",
      35,
      "fixed",
      "/hostbuddy-media/arrival.webp",
      ["Gare → logement", "Logement → gare"],
    ],
    [
      "Départ tardif",
      "Late checkout",
      "Prolonge le séjour fictif · 25 € par réservation",
      25,
      "fixed",
      "/hostbuddy-media/departure.webp",
      ["Jusqu’à midi", "Jusqu’à 13 h"],
    ],
  ].map(([frName, enName, description, price, pricingType, imagePath, options], i) => ({
    id: `demo-service-${i}`,
    name: `${fr ? frName : enName} · Démo`,
    description: String(description),
    price: Number(price),
    pricingType: pricingType as "fixed" | "per_person",
    imagePath: String(imagePath),
    bookingConfig: readBookingConfig({
      maxQuantity: i === 0 ? 10 : 1,
      requestDate: true,
      seller: "NONA · Démonstration",
      options: (options as string[]).map((label, j) => ({
        id: `11111111-1111-4111-8111-11111111111${j}`,
        label,
        priceCents: 0,
      })),
    }),
  }));
  return (
    <div className="nona-phone-document">
      <div hidden={!!serviceId}>
        <GuideView
          key={preview ? JSON.stringify(preview) : "villa"}
          guide={guide}
          importPreview={!!preview}
          onRequest={(id) => {
            setServiceId(id);
            window.scrollTo(0, 0);
          }}
        />
      </div>
      <DemoServiceBooking
        guide={guide}
        serviceId={serviceId}
        onClose={() => setServiceId(null)}
        immediate
      />
    </div>
  );
}
