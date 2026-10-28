import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { GuideView } from "@/components/guest/GuideView";
import { NonaConcierge } from "@/components/guest/NonaConcierge";
import { createVillaMare, demoGuide } from "@/components/demo/villa-mare-fixture";
import { LOCALES, useI18n, type Locale } from "@/lib/i18n";

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
  const guide = demoGuide(createVillaMare(locale));
  return (
    <div className="nona-phone-document">
      <GuideView guide={guide} />
      <NonaConcierge guide={guide} demo />
    </div>
  );
}
