import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listProperties } from "@/lib/data/properties";
import { orgQuery, useOrg } from "@/components/app/useOrg";
import { FriendlyError, Loading } from "@/components/app/Friendly";
import { QrCard } from "@/components/app/QrCard";

export const propertiesQuery = (orgId: string) => queryOptions({ queryKey: ["properties", orgId], queryFn: () => listProperties(orgId) });

export const Route = createFileRoute("/_authenticated/app/")({
  loader: async ({ context }) => {
    const org = await context.queryClient.ensureQueryData(orgQuery);
    await context.queryClient.ensureQueryData(propertiesQuery(org.id));
  },
  pendingComponent: () => <Loading />,
  errorComponent: () => <FriendlyError />,
  component: Home,
});

function Home() {
  const org = useOrg();
  const { data: properties } = useSuspenseQuery(propertiesQuery(org.id));
  const [qr, setQr] = useState<string | null>(null);
  if (!properties.length) return <Start firstName={org.firstName} />;
  return (
    <div className="mt-6">
      <h1 className="text-3xl font-semibold">Mes logements</h1>
      <Link to="/app/new" className="btn btn-primary mt-6 w-full text-lg">+ Ajouter un logement</Link>
      <ul className="mt-6 space-y-4">
        {properties.map((p) => (
          <li key={p.id} className="surface p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xl font-semibold">{p.name}</p>
              <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${p.status === "published" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
                {p.status === "published" ? "En ligne" : "Brouillon"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Link to="/app/p/$id" params={{ id: p.id }} className="btn btn-secondary px-2">Modifier</Link>
              {p.status === "published" ? (
                <>
                  <a href={`/l/${p.slug}`} target="_blank" rel="noreferrer" className="btn btn-secondary px-2">Voir</a>
                  <button className="btn btn-secondary px-2" onClick={() => setQr(qr === p.id ? null : p.id)}>QR</button>
                </>
              ) : (
                <p className="col-span-2 self-center text-sm text-muted-foreground">Publiez pour obtenir le lien et le QR.</p>
              )}
            </div>
            {qr === p.id && <div className="mt-6"><QrCard slug={p.slug} name={p.name} /></div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Start({ firstName }: { firstName?: string }) {
  return (
    <div>
      <p className="mt-6 text-lg text-muted-foreground">Bonjour{firstName ? ` ${firstName}` : ""} 👋</p>
      <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Créons votre premier logement</h1>
      <StartOptions />
    </div>
  );
}

export function StartOptions() {
  return (
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
  );
}
