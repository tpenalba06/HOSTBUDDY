import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listProperties, saveOrganizationPreferences } from "@/lib/data/properties";
import { orgQuery, useOrg } from "@/components/app/useOrg";
import { FriendlyError, Loading } from "@/components/app/Friendly";
import { QrCard } from "@/components/app/QrCard";
import { useI18n } from "@/lib/i18n";
import { ManagerPropertiesScreen } from "@/components/app/ManagerScreens";

export const propertiesQuery = (orgId: string) =>
  queryOptions({ queryKey: ["properties", orgId], queryFn: () => listProperties(orgId) });

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
  const { locale } = useI18n();
  const nav = useNavigate();
  const org = useOrg();
  const { data: properties } = useSuspenseQuery(propertiesQuery(org.id));
  if (!properties.length)
    return (
      <Start
        firstName={org.firstName}
        orgId={org.id}
        initialOperator={org.operator_type}
        locale={locale}
      />
    );
  return (
    <ManagerPropertiesScreen
      properties={properties}
      role={org.role}
      onAdd={() => nav({ to: "/app/new" })}
      onEdit={(id) => nav({ to: "/app/p/$id", params: { id } })}
      onView={(slug) => window.open(`/l/${slug}`, "_blank", "noopener,noreferrer")}
      renderEdit={(property, className, label) => (
        <Link to="/app/p/$id" params={{ id: property.id }} className={className}>
          {label}
        </Link>
      )}
      renderView={(property, className, label) => (
        <a href={`/l/${property.slug}`} target="_blank" rel="noreferrer" className={className}>
          {label}
        </a>
      )}
      renderQr={(property) => <QrCard slug={property.slug} name={property.name} />}
    />
  );
}

export function Start({
  firstName,
  orgId,
  initialOperator,
  locale,
}: {
  firstName?: string;
  orgId?: string;
  initialOperator?: string | null;
  locale?: string;
}) {
  const { t } = useI18n();
  const [operator, setOperator] = useState(initialOperator ?? "");
  return (
    <div>
      <p className="mt-6 text-lg text-muted-foreground">
        {t("app.hello")}
        {firstName ? ` ${firstName}` : ""} 👋
      </p>
      <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">{t("app.first")}</h1>
      {orgId && (
        <label className="mt-6 block">
          <span className="mb-1 block font-medium">{t("app.operator")}</span>
          <select
            className="field"
            value={operator}
            onChange={(e) => {
              const value = e.target.value;
              setOperator(value);
              if (value)
                void saveOrganizationPreferences(orgId, {
                  operatorType: value,
                  preferredLocale: locale ?? "fr",
                });
            }}
          >
            <option value="">—</option>
            <option value="concierge">{t("operator.concierge")}</option>
            <option value="vacation_rental">{t("operator.vacationRental")}</option>
            <option value="independent_hotel">{t("operator.hotel")}</option>
            <option value="aparthotel">{t("operator.aparthotel")}</option>
            <option value="tourist_residence">{t("operator.residence")}</option>
          </select>
          <span className="mt-1 block text-sm text-muted-foreground">{t("app.operatorHint")}</span>
        </label>
      )}
      <StartOptions />
    </div>
  );
}

export function StartOptions() {
  const { t } = useI18n();
  return (
    <div className="mt-8 space-y-4">
      <Link
        to="/app/import-url"
        className="surface relative block border-2 border-primary p-6 transition hover:-translate-y-0.5"
      >
        <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground">
          {t("app.recommended")}
        </span>
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
