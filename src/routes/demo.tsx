import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { DemoExperience } from "@/components/demo/DemoExperience";
import { Logo } from "@/components/shared/Logo";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import { useI18n } from "@/lib/i18n";
import { uxCopy } from "@/lib/ux-copy";
const title = "Démo interactive NONA";
const description = "Essayez le guide voyageur et le même éditeur que les gestionnaires HostBuddy.";
export const Route = createFileRoute("/demo")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { device?: "mobile"; preview?: "guide" | "manager"; mode?: "guest" | "manager" } => ({
    ...(search["mode"] === "guest" || search["mode"] === "manager" ? { mode: search["mode"] } : {}),
    ...(search["device"] === "mobile" ? { device: "mobile" as const } : {}),
    ...(search["preview"] === "manager" || search["preview"] === "guide"
      ? { preview: search["preview"] }
      : {}),
  }),
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
  const { t, locale } = useI18n();
  const ux = uxCopy(locale);
  const { device, preview, mode } = Route.useSearch();
  const navigate = Route.useNavigate();
  if (preview)
    return <DemoExperience standalone initialMode={preview === "manager" ? "manager" : "guest"} />;
  return (
    <div className="nona-demo-page min-h-screen bg-background text-foreground">
      <a href="#demo-content" className="nona-skip-link">
        {ux.skipContent}
      </a>
      <header className="nona-demo-header">
        <Link to="/" className="inline-flex min-h-12 min-w-0 items-center gap-2 font-semibold">
          <ArrowLeft className="shrink-0" />
          <span>{t("common.backSite")}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageSelect compact />
          <div className="hidden sm:block">
            <Logo />
          </div>
        </div>
      </header>
      <main id="demo-content" className="mx-auto max-w-7xl" tabIndex={-1}>
        <h1 className="sr-only">{t("demo.pageTitle")}</h1>
        <div style={device === "mobile" ? { maxWidth: 390, marginInline: "auto" } : undefined}>
          <DemoExperience
            action={
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="btn btn-primary nona-demo-create"
              >
                {ux.createGuide}
              </Link>
            }
            initialMode={mode ?? "guest"}
            onModeChange={(next) => {
              void navigate({
                search: (previous) => ({ ...previous, mode: next }),
                resetScroll: false,
              });
            }}
          />
        </div>
      </main>
    </div>
  );
}
