import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  deletePropertyPermanently,
  listPropertyDeletionCleanup,
} from "@/lib/data/property-deletion.functions";
import { useState } from "react";
import { listProperties, saveOrganizationPreferences } from "@/lib/data/properties";
import { orgQuery, useOrg } from "@/components/app/useOrg";
import { FriendlyError, Loading } from "@/components/app/Friendly";
import { QrCard } from "@/components/app/QrCard";
import { useI18n } from "@/lib/i18n";
import {
  ManagerPropertiesScreen,
  ManagerNewPropertyOptions,
} from "@/components/app/ManagerScreens";

export const propertiesQuery = (orgId: string) =>
  queryOptions({ queryKey: ["properties", orgId], queryFn: () => listProperties(orgId) });

const cleanupQuery = (orgId: string) =>
  queryOptions({
    queryKey: ["property-deletion-cleanup", orgId],
    queryFn: () => listPropertyDeletionCleanup({ data: { organizationId: orgId } }),
  });

export const Route = createFileRoute("/_authenticated/app/")({
  loader: async ({ context }) => {
    const org = await context.queryClient.ensureQueryData(orgQuery);
    await Promise.all([
      context.queryClient.ensureQueryData(propertiesQuery(org.id)),
      context.queryClient.ensureQueryData(cleanupQuery(org.id)),
    ]);
  },
  pendingComponent: () => <Loading />,
  errorComponent: () => <FriendlyError />,
  component: Home,
});

function Home() {
  const { locale } = useI18n();
  const nav = useNavigate();
  const org = useOrg();
  const queryClient = useQueryClient();
  const { data: properties } = useSuspenseQuery(propertiesQuery(org.id));
  const { data: pendingDeletions } = useSuspenseQuery(cleanupQuery(org.id));
  const [startedWithProperties] = useState(properties.length > 0);
  if (!properties.length && !startedWithProperties && !pendingDeletions.length)
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
      pendingDeletions={pendingDeletions}
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
      onDelete={async (propertyId, confirmedName) => {
        const result = await deletePropertyPermanently({ data: { propertyId, confirmedName } });
        queryClient.setQueryData(
          propertiesQuery(org.id).queryKey,
          properties.filter((p) => p.id !== propertyId),
        );
        await queryClient.invalidateQueries({ queryKey: ["properties", org.id] });
        await queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["dashboard", org.id] }),
          queryClient.invalidateQueries({ queryKey: ["payments", org.id] }),
          queryClient.invalidateQueries({ queryKey: cleanupQuery(org.id).queryKey }),
        ]);
        return result;
      }}
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
  const nav = useNavigate();
  return (
    <ManagerNewPropertyOptions
      onImportUrl={() => nav({ to: "/app/import-url" })}
      onPasteText={() => nav({ to: "/app/import-text" })}
      onManual={() => nav({ to: "/app/manual" })}
    />
  );
}
