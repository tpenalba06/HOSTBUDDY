import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getPublicGuide, type PublicSection } from "@/lib/data/public-guide.functions";

// Public guest experience: no login, no install, published content only.
export const Route = createFileRoute("/l/$slug")({
  loader: async ({ params }) => {
    const guide = await getPublicGuide({ data: { slug: params.slug } });
    if (!guide) throw notFound();
    return guide;
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.name} — Livret d'accueil` : "Livret indisponible";
    const desc = loaderData ? `Toutes les informations de votre séjour : ${loaderData.name}.` : "Ce livret n'est pas disponible.";
    return { meta: [
      { title }, { name: "description", content: desc }, { property: "og:title", content: title }, { property: "og:description", content: desc },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
      ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
    ] };
  },
  notFoundComponent: Unavailable,
  errorComponent: Unavailable,
  component: GuestPage,
});

function Unavailable() {
  return (
    <main className="mx-auto max-w-md px-5 py-16 text-center">
      <p className="text-5xl">🏡</p>
      <h1 className="mt-4 text-3xl font-semibold">Ce livret n'est pas encore disponible</h1>
      <p className="mt-3 text-lg">Il est peut-être en cours de préparation. Contactez votre hôte ou réessayez un peu plus tard.</p>
      <Link to="/" className="btn btn-secondary mt-8">Découvrir HostBuddy</Link>
    </main>
  );
}

function GuestPage() {
  const guide = Route.useLoaderData();
  const [open, setOpen] = useState<PublicSection | null>(null);
  const contact = guide.sections.find((s) => s.key === "contact");

  if (open) {
    return (
      <main className="mx-auto max-w-md px-4 py-6">
        <button onClick={() => setOpen(null)} className="min-h-12 font-semibold text-primary">← Retour à l'accueil</button>
        <h1 className="mt-2 text-3xl font-semibold">{open.title}</h1>
        <div className="mt-4 space-y-4">
          {open.content.items?.map((it, i) => (
            <div key={i} className="surface p-4"><p className="text-sm font-semibold text-muted-foreground">{it.label}</p><p className="mt-1 whitespace-pre-line text-lg">{it.text}</p></div>
          ))}
          {open.key === "contact" && <ContactButtons s={open} />}
        </div>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="rounded-2xl bg-warm p-6">
        <p className="text-muted-foreground">Bienvenue à</p>
        <h1 className="text-3xl font-semibold">{guide.name}</h1>
      </div>
      {guide.sections.length === 0 ? <p className="mt-6 text-lg">Les informations arrivent bientôt.</p> : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {guide.sections.map((s) => (
            <button key={s.key} onClick={() => setOpen(s)} className="flex min-h-16 items-center rounded-xl border bg-card px-4 text-left text-lg font-medium hover:border-primary">{s.title}</button>
          ))}
        </div>
      )}
      {contact && <div className="mt-6"><ContactButtons s={contact} /></div>}
    </main>
  );
}

function ContactButtons({ s }: { s: PublicSection }) {
  const phone = s.content.phones?.[0];
  const email = s.content.emails?.[0];
  if (!phone && !email) return null;
  return (
    <div className="grid gap-2">
      {phone && <a className="btn btn-primary" href={`tel:${phone}`}>📞 Appeler</a>}
      {phone && <a className="btn btn-secondary" href={`https://wa.me/${phone.replace("+", "")}`} target="_blank" rel="noreferrer">💬 WhatsApp</a>}
      {email && <a className="btn btn-secondary" href={`mailto:${email}`}>✉️ E-mail</a>}
    </div>
  );
}
