import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import { legalDocuments, legalPublicationGaps, legalRevision } from "@/lib/legal-content";
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
      <div lang="fr">
        <p className="mt-3 text-sm text-muted-foreground">{legalRevision}</p>
        <nav
          aria-label="Sommaire des documents légaux"
          className="mt-6 flex flex-wrap gap-x-5 gap-y-2"
        >
          {legalDocuments.map((document) => (
            <a
              key={document.id}
              href={`#${document.id}`}
              className="min-h-12 py-3 text-primary underline"
            >
              {document.title}
            </a>
          ))}
        </nav>
        <aside aria-labelledby="legal-missing" className="mt-6 rounded-xl border p-4">
          <h2 id="legal-missing" className="text-xl font-semibold">
            À compléter avant commercialisation
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            {legalPublicationGaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </aside>
        {legalDocuments.map((document) => (
          <section
            key={document.id}
            id={document.id}
            aria-labelledby={`${document.id}-title`}
            className="mt-10 scroll-mt-6 border-t pt-8"
          >
            <h2 id={`${document.id}-title`} className="text-2xl font-semibold">
              {document.title}
            </h2>
            <p className="mt-3">{document.intro}</p>
            {document.sections.map((section) => (
              <section key={section.title} className="mt-6">
                <h3 className="text-lg font-semibold">{section.title}</h3>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-2">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
