import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
export const Route = createFileRoute("/legal")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: LegalPreparation,
});
function LegalPreparation() {
  const { t } = useI18n();
  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <header className="flex items-center justify-between gap-4">
        <Link to="/" className="min-h-12 py-3 text-primary">
          ← {t("common.backSite")}
        </Link>
        <LanguageSelect compact />
      </header>
      <h1 className="mt-6 text-3xl font-semibold">{t("legal.title")}</h1>
      <p role="status" className="mt-4 rounded-xl border p-4">
        {t("legal.draft")}
      </p>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t("legal.publisher")}</h2>
        <p className="mt-2">{t("legal.publisherMissing")}</p>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t("legal.privacy")}</h2>
        <p className="mt-2">{t("legal.privacyMissing")}</p>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t("legal.terms")}</h2>
        <p className="mt-2">{t("marketing.trial")}</p>
        <p>
          {t("marketing.paidTier")} : {t("marketing.price")} · {t("marketing.priceNote")}
        </p>
        <p className="mt-2">{t("legal.fees")}</p>
        <p className="mt-2">{t("legal.termsMissing")}</p>
      </section>
    </main>
  );
}
