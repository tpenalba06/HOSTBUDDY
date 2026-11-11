import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { GuideView } from "@/components/guest/GuideView";
import { NonaConcierge } from "@/components/guest/NonaConcierge";
import { createVillaMare, demoGuide } from "@/components/demo/villa-mare-fixture";
import { LOCALES, useI18n, type Locale } from "@/lib/i18n";

import { publicPreviewSchema, type PublicImportPreview } from "@/lib/import-engine/public-preview";
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
  const { locale, setLocale } = useI18n();
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
  const guide: GuideViewData = preview
    ? {
        id: "import-preview",
        name: fr ? "Votre logement" : "Your property",
        originalLocale: locale,
        coverUrl: "/hostbuddy-media/apartment.webp",
        subtitle: fr
          ? "Image d’illustration · Informations à vérifier"
          : "Illustration · Details to review",
        sections: [
          ...(preview.arrival
            ? [
                {
                  id: "arrival",
                  key: "arrival",
                  title: fr ? "Arrivée" : "Arrival",
                  content: { items: [{ label: "", text: preview.arrival }] },
                },
              ]
            : []),
          ...(preview.departure
            ? [
                {
                  id: "departure",
                  key: "departure",
                  title: fr ? "Départ" : "Departure",
                  content: { items: [{ label: "", text: preview.departure }] },
                },
              ]
            : []),
          ...(preview.capacity
            ? [
                {
                  id: "house",
                  key: "house",
                  title: fr ? "Le logement" : "The property",
                  content: {
                    items: [
                      { label: fr ? "Capacité" : "Capacity", text: String(preview.capacity) },
                    ],
                  },
                },
              ]
            : []),
        ],
      }
    : demoGuide(createVillaMare(locale));
  return (
    <div className="nona-phone-document">
      <GuideView key={preview ? JSON.stringify(preview) : "villa"} guide={guide} />
      {!preview && <NonaConcierge guide={guide} demo />}
    </div>
  );
}
