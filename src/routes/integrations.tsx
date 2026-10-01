import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, CircleDashed, Send } from "lucide-react";
import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";
import { INTEGRATION_CATEGORIES, getVisibleIntegrations, type IntegrationCategory, type IntegrationStatus } from "@/lib/integrations/registry";

const TITLE = "Intégrations HostBuddy — Importez vos outils, simplement";
const DESCRIPTION = "Découvrez les sources d’import et les connexions prévues pour HostBuddy, avec un statut clair et sans fausse promesse.";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: TITLE }, { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE }, { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IntegrationsPage,
});

const CATEGORY_COPY: Record<IntegrationCategory, { title: string; description: string }> = {
  listing_import: { title: "Importer un logement", description: "Le point de départ : un lien ou un texte devient un guide à vérifier." },
  pms: { title: "PMS & channel managers", description: "Demain, connectez votre outil une fois et préparez plusieurs guides ensemble." },
  payments: { title: "Paiements", description: "Des services réservables par les voyageurs, sans compte à créer." },
  social_media: { title: "Contenus & réseaux", description: "Des liens et intégrations officielles, sans prétendre à une connexion plus profonde." },
  local_recommendations: { title: "Adresses & activités", description: "Recherche de lieux, itinéraires et activités utiles autour du séjour." },
  translation: { title: "Traduction", description: "Traductions assistées, toujours modifiables par l’hébergeur." },
  personalization: { title: "Personnalisation", description: "Une sélection volontairement simple de polices et d’images." },
  smart_access: { title: "Accès connecté", description: "Préparer les informations d’accès sans alourdir le guide." },
  ai: { title: "Intelligence artificielle", description: "Des fournisseurs techniques invisibles pour les utilisateurs." },
};

const STATUS_COPY: Record<IntegrationStatus, string> = { available: "Disponible", beta: "Bêta", planned: "Prévu" };

function Status({ status }: { status: IntegrationStatus }) {
  const live = status === "available";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${live ? "bg-success-soft text-success" : status === "beta" ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"}`}>
    {live ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}{STATUS_COPY[status]}
  </span>;
}

function IntegrationCards({ category }: { category: IntegrationCategory }) {
  const items = getVisibleIntegrations().filter((item) => item.category === category);
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => (
    <article key={item.id} className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-secondary text-sm font-extrabold text-secondary-foreground" aria-hidden>{item.logoPlaceholder}</span>
        <Status status={item.status} />
      </div>
      <h3 className="mt-4 text-xl font-semibold">{item.name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.note ?? (item.status === "planned" ? "Connexion préparée, non disponible aujourd’hui." : "Fonction prise en charge par HostBuddy.")}</p>
    </article>
  ))}</div>;
}

function IntegrationsPage() {
  const [sent, setSent] = useState(false);
  const categories = INTEGRATION_CATEGORIES.filter((category) => category !== "ai" && getVisibleIntegrations().some((item) => item.category === category));
  return <div className="min-h-screen">
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5"><Logo/><Button asChild variant="outline" className="min-h-12 rounded-full"><Link to="/auth" search={{ mode: "login" }}>Se connecter</Link></Button></header>
    <main>
      <section className="border-y bg-warm py-20 sm:py-28"><div className="mx-auto max-w-5xl px-5 text-center"><p className="font-bold text-primary">Connexions HostBuddy</p><h1 className="mx-auto mt-4 max-w-4xl text-balance text-5xl font-semibold leading-tight sm:text-7xl">Vos outils alimentent le même accueil voyageur.</h1><p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">Commencez par un lien ou un texte. Les futures connexions PMS suivront le même chemin simple : importer, vérifier ce qui manque, publier.</p><Button asChild size="lg" className="mt-8 min-h-12 rounded-full px-6 text-base"><Link to="/auth" search={{ mode: "signup" }}>Essayer l’import gratuit<ArrowRight/></Link></Button><p className="mt-4 text-sm text-muted-foreground">Les marques citées décrivent des sources ou connexions envisagées. Elles ne sont pas présentées comme partenaires.</p></div></section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="mb-10 max-w-3xl"><h2 className="text-4xl font-semibold">Un statut clair, pour chaque connexion</h2><p className="mt-3 text-muted-foreground"><strong>Disponible</strong> fonctionne aujourd’hui. <strong>Bêta</strong> dépend de l’accès public à la source et propose un repli. <strong>Prévu</strong> n’est pas encore connectable.</p></div>
        <div className="hidden space-y-14 md:block">{categories.map((category) => <section key={category}><div className="mb-5"><h2 className="text-3xl font-semibold">{CATEGORY_COPY[category].title}</h2><p className="mt-1 text-muted-foreground">{CATEGORY_COPY[category].description}</p></div><IntegrationCards category={category}/></section>)}</div>
        <Accordion type="single" defaultValue="listing_import" collapsible className="md:hidden">{categories.map((category) => <AccordionItem key={category} value={category}><AccordionTrigger className="min-h-16 text-left text-xl font-semibold no-underline">{CATEGORY_COPY[category].title}</AccordionTrigger><AccordionContent><p className="mb-4 text-muted-foreground">{CATEGORY_COPY[category].description}</p><IntegrationCards category={category}/></AccordionContent></AccordionItem>)}</Accordion>
      </section>

      <section className="bg-ink py-20 text-ink-foreground"><div className="mx-auto max-w-4xl px-5"><div className="max-w-2xl"><h2 className="text-4xl font-semibold">Connecter un PMS, sans usine à gaz</h2><p className="mt-4 text-ink-foreground/75">Connecter mon outil → choisir les logements trouvés → créer les guides → vérifier uniquement les informations manquantes.</p></div></div></section>

      <section className="mx-auto max-w-3xl px-5 py-20"><div className="surface p-6 sm:p-10"><Send className="h-8 w-8 text-primary"/><h2 className="mt-4 text-3xl font-semibold">Suggérer une intégration</h2><p className="mt-2 text-muted-foreground">Dites-nous quel outil vous ferait gagner le plus de temps.</p>{sent ? <p className="mt-6 rounded-lg bg-warning-soft p-4 font-semibold text-warning">Merci. Le recueil des suggestions sera ouvert prochainement ; aucune information n’a été envoyée.</p> : <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); setSent(true); }}><label className="block"><span className="mb-1 block font-semibold">Nom de l’outil</span><input className="field" required maxLength={100} name="tool" autoComplete="organization"/></label><label className="block"><span className="mb-1 block font-semibold">Comment l’utilisez-vous ?</span><textarea className="field min-h-32" required minLength={10} maxLength={1000} name="use"/></label><Button className="min-h-12 w-full rounded-full text-base" type="submit">Préparer ma suggestion</Button></form>}</div></section>
    </main>
    <footer className="border-t py-10"><div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row"><Logo/><Link to="/" className="font-semibold text-primary hover:underline">Retour à l’accueil</Link></div></footer>
  </div>;
}
