import { Languages } from "lucide-react";
import { LOCALES, LOCALE_NAMES, useI18n } from "@/lib/i18n";

export function LanguageSelect({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className="inline-flex min-h-12 items-center gap-2 rounded-full border bg-card px-3 text-sm font-semibold shadow-sm">
      <Languages className="h-4 w-4 text-primary" aria-hidden />
      {!compact && <span className="sr-only sm:not-sr-only">{t("common.language")}</span>}
      <select className="w-11 cursor-pointer appearance-auto bg-transparent text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" value={locale} onChange={(e) => setLocale(e.target.value as (typeof LOCALES)[number])} aria-label={t("common.language")}>
        {LOCALES.map((code) => <option key={code} value={code}>{compact ? code.toUpperCase() : LOCALE_NAMES[code]}</option>)}
      </select>
    </label>
  );
}
