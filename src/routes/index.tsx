import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/shared/Logo";
import { PhoneDemo } from "@/components/marketing/PhoneDemo";

const TITLE = "HostBuddy — Le livret d'accueil qui se crée tout seul";
const DESC = "Collez le lien de votre logement, HostBuddy prépare le livret voyageur. Moins de messages, plus de services vendus. 30 jours gratuits.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE }, { name: "description", content: DESC },
      { property: "og:title", content: TITLE }, { property: "og:description", content: DESC },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Logo />
        <Link to="/signup" className="btn btn-secondary">Se connecter</Link>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="mb-4 inline-block rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground">Collez un lien → votre livret est presque prêt</p>
          <h1 className="text-4xl font-semibold leading-[1.05] sm:text-6xl">
            Moins de messages.<br />Une meilleure expérience voyageur.<br /><span className="text-primary">Plus de services vendus.</span>
          </h1>
          <ul className="mt-6 space-y-2 text-lg">
            <li>✓ Votre livret créé à partir de votre annonce Airbnb ou Booking</li>
            <li>✓ Vos voyageurs scannent un QR code, sans appli ni compte</li>
            <li>✓ Petit-déjeuner, ménage, transfert : vendus en 2 clics</li>
          </ul>
          <div className="mt-6 flex items-baseline gap-2">
            <span className="font-display text-4xl font-semibold">9,99 €</span><span className="text-muted-foreground">/ mois · jusqu'à 3 logements</span>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to="/signup" className="btn btn-primary text-lg">Essayer gratuitement</Link>
            <a href="#demo" className="btn btn-secondary">Voir la démo</a>
          </div>
          <p className="mt-4 text-muted-foreground">30 jours gratuits • Aucune installation pour vos voyageurs</p>
        </div>
        <div id="demo"><PhoneDemo /><p className="mt-4 text-center text-muted-foreground">Essayez : touchez une rubrique, ou passez en mode Conciergerie.</p></div>
      </section>

      <section className="bg-warm py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-3xl font-semibold sm:text-4xl">Prêt en quelques minutes</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[["1", "Collez un lien", "Airbnb, Booking, votre site… ou simplement vos notes."],
              ["2", "Vérifiez", "On vous pose seulement les questions qui manquent."],
              ["3", "Partagez le QR", "Vos voyageurs ont tout, tout de suite."]].map(([n, t, d]) => (
              <div key={n} className="surface p-6">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-primary font-semibold text-primary-foreground">{n}</span>
                <h3 className="mt-4 text-xl font-semibold">{t}</h3><p className="mt-2 text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-xl px-5 py-20 text-center">
        <h2 className="text-3xl font-semibold sm:text-4xl">Un seul prix, simple</h2>
        <div className="surface mt-8 p-8">
          <p className="font-display text-5xl font-semibold">9,99 €<span className="text-xl text-muted-foreground"> / mois</span></p>
          <p className="mt-2 text-lg">Jusqu'à 3 logements inclus</p>
          <p className="text-muted-foreground">+ 2,99 € / mois par logement supplémentaire</p>
          <Link to="/signup" className="btn btn-primary mt-6 w-full text-lg">Essayer gratuitement</Link>
          <p className="mt-3 text-muted-foreground">30 jours gratuits, sans carte bancaire</p>
        </div>
      </section>
      <footer className="border-t py-8 text-center text-muted-foreground">© 2026 HostBuddy · <Link to="/l/$slug" params={{ slug: "villa-mare" }} className="underline">Exemple de livret</Link></footer>
    </div>
  );
}
