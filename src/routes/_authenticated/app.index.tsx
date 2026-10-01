import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listProperties, saveOrganizationPreferences } from "@/lib/data/properties";
import { orgQuery, useOrg } from "@/components/app/useOrg";
import { FriendlyError, Loading } from "@/components/app/Friendly";
import { QrCard } from "@/components/app/QrCard";
import { useI18n } from "@/lib/i18n";

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
  const { t, locale } = useI18n();
  const org = useOrg();
  const { data: properties } = useSuspenseQuery(propertiesQuery(org.id));
  const [qr, setQr] = useState<string | null>(null);
  if (!properties.length) return <Start firstName={org.firstName} orgId={org.id} initialOperator={org.operator_type} locale={locale} />;
  return (
    <div className="mt-6">
      <h1 className="text-3xl font-semibold">{t("app.myProperties")}</h1>
       {org.role !== "member" && <Link to="/app/new" className="btn btn-primary mt-6 w-full text-lg">+ {t("app.add")}</Link>}
      <ul className="mt-6 space-y-4">
        {properties.map((p) => (
          <li key={p.id} className="surface p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xl font-semibold">{p.name}</p>
              <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${p.status === "published" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
                {p.status === "published" ? t("app.published") : t("app.draft")}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
               <Link to="/app/p/$id" params={{ id: p.id }} className="btn btn-secondary px-2">{org.role === "member" ? t("common.view") : t("common.edit")}</Link>
              {p.status === "published" ? (
                <>
                   <a href={`/l/${p.slug}`} target="_blank" rel="noreferrer" className="btn btn-secondary px-2">{t("common.view")}</a>
                  <button className="btn btn-secondary px-2" onClick={() => setQr(qr === p.id ? null : p.id)}>QR</button>
                </>
              ) : (
                 <p className="col-span-2 self-center text-sm text-muted-foreground">{t("app.publishHint")}</p>
              )}
            </div>
            {qr === p.id && <div className="mt-6"><QrCard slug={p.slug} name={p.name} /></div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Start({ firstName, orgId, initialOperator, locale }: { firstName?: string; orgId?: string; initialOperator?: string | null; locale?: string }) {
  const { t } = useI18n();
  const [operator, setOperator] = useState(initialOperator ?? "");
  return (
    <div>
      <p className="mt-6 text-lg text-muted-foreground">{t("app.hello")}{firstName ? ` ${firstName}` : ""} 👋</p>
      <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">{t("app.first")}</h1>
      {orgId && <label className="mt-6 block"><span className="mb-1 block font-medium">{t("app.operator")}</span><select className="field" value={operator} onChange={(e) => { const value = e.target.value; setOperator(value); if (value) void saveOrganizationPreferences(orgId, { operatorType: value, preferredLocale: locale ?? "fr" }); }}><option value="">—</option><option value="concierge">Conciergerie</option><option value="vacation_rental">Locations saisonnières</option><option value="independent_hotel">Hôtel indépendant</option><option value="aparthotel">Appart'hôtel</option><option value="tourist_residence">Résidence de tourisme</option></select><span className="mt-1 block text-sm text-muted-foreground">{t("app.operatorHint")}</span></label>}
      <StartOptions />
    </div>
  );
}

export function StartOptions() {
  const { t } = useI18n();
  return (
    <div className="mt-8 space-y-4">
      <Link to="/app/import-url" className="surface relative block border-2 border-primary p-6 transition hover:-translate-y-0.5">
        <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground">{t("app.recommended")}</span>
        <p className="text-xl font-semibold">🔗 {t("app.importUrl")}</p>
        <p className="mt-1 text-muted-foreground">{t("app.importUrlD")}</p>
      </Link>
      <Link to="/app/import-text" className="surface block p-6 transition hover:-translate-y-0.5">
        <p className="text-xl font-semibold">📝 {t("app.paste")}</p>
        <p className="mt-1 text-muted-foreground">{t("app.pasteD")}</p>
      </Link>
      <Link to="/app/manual" className="surface block p-6 transition hover:-translate-y-0.5">
        <p className="text-xl font-semibold">✏️ {t("app.manual")}</p>
        <p className="mt-1 text-muted-foreground">{t("app.manualD")}</p>
      </Link>
    </div>
  );
}
