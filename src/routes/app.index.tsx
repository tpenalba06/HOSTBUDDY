import { createFileRoute, Link } from "@tanstack/react-router";
import { getUser } from "@/lib/store";

export const Route = createFileRoute("/app/")({ component: Start });

function Start() {
  const name = getUser()?.firstName;
  return (
    <div>
      <p className="mt-6 text-lg text-muted-foreground">Bonjour {name} 👋</p>
      <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Créons votre premier logement</h1>
      <div className="mt-8 space-y-4">
        <Link to="/app/import-url" className="surface relative block border-2 border-primary p-6 transition hover:-translate-y-0.5">
          <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground">Recommandé</span>
          <p className="text-xl font-semibold">🔗 Importer depuis un lien</p>
          <p className="mt-1 text-muted-foreground">Airbnb • Booking • Sunver • autre page web</p>
        </Link>
        <Link to="/app/import-text" className="surface block p-6 transition hover:-translate-y-0.5">
          <p className="text-xl font-semibold">📝 Coller du texte</p>
          <p className="mt-1 text-muted-foreground">Vos notes, un message WhatsApp, un ancien livret…</p>
        </Link>
        <Link to="/app/manual" className="surface block p-6 transition hover:-translate-y-0.5">
          <p className="text-xl font-semibold">✏️ Créer manuellement</p>
          <p className="mt-1 text-muted-foreground">On vous guide question par question.</p>
        </Link>
      </div>
    </div>
  );
}
