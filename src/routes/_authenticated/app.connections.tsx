import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Cable, CircleDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { INTEGRATIONS } from "@/lib/integrations/registry";

export const Route = createFileRoute("/_authenticated/app/connections")({
  head: () => ({ meta: [{ title: "Connexions — HostBuddy" }, { name: "description", content: "Les outils reliés à votre espace HostBuddy." }, { property: "og:title", content: "Connexions — HostBuddy" }, { property: "og:description", content: "Les outils reliés à votre espace HostBuddy." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const { t } = useI18n();
  const priorities = INTEGRATIONS.filter((item) => item.category === "pms").slice(0, 4);
  return <div className="mt-6">
    <Link to="/app" className="inline-flex min-h-12 items-center gap-2 font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4"/>{t("common.back")}</Link>
    <Cable className="mt-8 h-9 w-9 text-primary"/>
    <h1 className="mt-4 text-4xl font-semibold">{t("connections.title")}</h1>
    <p className="mt-3 max-w-xl text-muted-foreground">{t("connections.desc")}</p>
    <section className="mt-8"><h2 className="text-2xl font-semibold">{t("connections.connected")}</h2><div className="mt-4 rounded-lg border border-dashed bg-card p-6 text-center"><p className="font-semibold">{t("connections.none")}</p><p className="mt-1 text-sm text-muted-foreground">L’import par lien et par texte reste disponible depuis l’accueil.</p></div></section>
    <section className="mt-10"><h2 className="text-2xl font-semibold">{t("connections.upcoming")}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{priorities.map((item) => <article className="rounded-lg border bg-card p-4" key={item.id}><div className="flex items-center justify-between gap-3"><span className="font-semibold">{item.name}</span><span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-bold text-muted-foreground"><CircleDashed className="h-3 w-3"/>{t("connections.planned")}</span></div><p className="mt-2 text-sm text-muted-foreground">Import groupé de logements, après autorisation officielle.</p></article>)}</div></section>
    <Button asChild variant="outline" className="mt-8 min-h-12 w-full rounded-full"><Link to="/integrations">{t("connections.all")}</Link></Button>
  </div>;
}
