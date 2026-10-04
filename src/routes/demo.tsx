import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { DemoExperience } from "@/components/demo/DemoExperience";
import { Logo } from "@/components/shared/Logo";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import { useI18n } from "@/lib/i18n";
const title = "Démo interactive HostBuddy";
const description = "Essayez le guide voyageur et le même éditeur que les gestionnaires HostBuddy.";
export const Route = createFileRoute("/demo")({
  validateSearch: (search: Record<string, unknown>): { device?: "mobile" } =>
    search["device"] === "mobile" ? { device: "mobile" } : {},
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DemoPage,
});
function DemoPage() {
  const { t } = useI18n();
  const { device } = Route.useSearch();
  return (
    <div className="min-h-screen bg-ink px-3 py-4 text-ink-foreground sm:px-6 sm:py-6">
      <header className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <Link to="/" className="inline-flex min-h-12 min-w-0 items-center gap-2 font-semibold">
          <ArrowLeft className="shrink-0" />
          <span>{t("common.backSite")}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageSelect compact />
          <div className="hidden rounded-full bg-background px-4 py-2 text-foreground sm:block">
            <Logo />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl py-6 sm:py-10">
        <div className="mb-7 max-w-2xl">
          <h1 className="text-4xl font-semibold sm:text-5xl">{t("demo.pageTitle")}</h1>
          <p className="mt-3 text-lg text-ink-foreground/80">{t("demo.pageDesc")}</p>
        </div>
        <div style={device === "mobile" ? { maxWidth: 390, marginInline: "auto" } : undefined}>
          <DemoExperience />
        </div>
      </main>
    </div>
  );
}
