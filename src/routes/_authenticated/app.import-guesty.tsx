import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useOrg } from "@/components/app/useOrg";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { manageGuesty } from "@/lib/integrations/providers/guesty.functions";
import type { NormalizedProperty } from "@/lib/integrations/providers/model";
export const Route = createFileRoute("/_authenticated/app/import-guesty")({
  component: GuestyImport,
});
function GuestyImport() {
  const org = useOrg();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [properties, setProperties] = useState<NormalizedProperty[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [next, setNext] = useState<number | null>(0);
  const [created, setCreated] = useState<string[]>([]);
  const query = useQuery({
    queryKey: ["guesty", org.id],
    enabled: org.role !== "member",
    queryFn: () => manageGuesty({ data: { organizationId: org.id, action: "status" } }),
  });
  const status = query.data && "status" in query.data ? query.data.status : null;
  const list = async () => {
    const result = await manageGuesty({
      data: { organizationId: org.id, action: "list", offset: next ?? 0 },
    });
    if ("page" in result && result.page) {
      const page = result.page;
      setProperties((current) => [
        ...current,
        ...page.properties.filter((row) => !current.some((p) => p.externalId === row.externalId)),
      ]);
      setNext(page.nextOffset);
    }
  };
  const run = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      await work();
      await qc.invalidateQueries({ queryKey: ["guesty", org.id] });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  if (org.role === "member") return <p role="alert">{t("app.readOnly")}</p>;
  return (
    <div className="py-6">
      <Link to="/app/new" className="inline-flex min-h-12 items-center font-semibold text-primary">
        ← {t("common.back")}
      </Link>
      <h1 className="mt-2 text-4xl">{t("provider.title")}</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">{t("provider.description")}</p>
      {(error || query.isError) && (
        <p role="alert" className="mt-4 rounded-xl bg-warning-soft p-4">
          {t("provider.error")}
        </p>
      )}
      {query.isLoading ? (
        <p className="mt-5" role="status">
          {t("common.loading")}
        </p>
      ) : !status?.configured ? (
        <p className="surface mt-6 p-6">{t("provider.notConfigured")}</p>
      ) : !status.connected ? (
        <form
          className="surface mt-6 max-w-xl space-y-5 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await manageGuesty({
                data: { organizationId: org.id, action: "connect", clientId, clientSecret },
              });
              setClientSecret("");
              await list();
            });
          }}
        >
          <p className="text-sm text-muted-foreground">{t("provider.credentials")}</p>
          <label className="block">
            {t("provider.clientId")}
            <input
              className="field mt-2"
              autoComplete="off"
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
          </label>
          <label className="block">
            {t("provider.clientSecret")}
            <input
              className="field mt-2"
              type="password"
              autoComplete="off"
              required
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
          </label>
          <Button className="min-h-12 w-full" disabled={busy}>
            {t(busy ? "common.loading" : "provider.connect")}
          </Button>
        </form>
      ) : (
        <section className="mt-6">
          <p className="text-sm text-success">{t("provider.connected")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("provider.oneTime")}</p>
          {properties.length === 0 && (
            <Button className="mt-5 min-h-12" disabled={busy} onClick={() => run(list)}>
              {t("provider.loadMore")}
            </Button>
          )}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {properties.map((property) => (
              <label
                key={property.externalId}
                className="surface flex min-h-20 items-center gap-3 p-4"
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0"
                  checked={selected.includes(property.externalId)}
                  disabled={busy}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, property.externalId]
                        : current.filter((id) => id !== property.externalId),
                    )
                  }
                />
                <span className="min-w-0">
                  <strong className="block break-words">
                    {property.name ?? property.externalId}
                  </strong>
                  {property.address && (
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {property.address}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
          {!!selected.length && (
            <Button
              className="mt-5 min-h-12"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  for (const id of [...selected]) {
                    const result = await manageGuesty({
                      data: { organizationId: org.id, action: "import", externalId: id },
                    });
                    if ("propertyId" in result && result.propertyId) {
                      const propertyId = result.propertyId;
                      setCreated((current) => [...new Set([...current, propertyId])]);
                    }
                    setSelected((current) => current.filter((item) => item !== id));
                  }
                  await qc.invalidateQueries({ queryKey: ["properties", org.id] });
                })
              }
            >
              {t("provider.import")} ({selected.length})
            </Button>
          )}
          {next !== null && properties.length > 0 && (
            <Button
              variant="outline"
              className="ml-2 mt-5 min-h-12"
              disabled={busy}
              onClick={() => run(list)}
            >
              {t("provider.loadMore")}
            </Button>
          )}
          <Button
            variant="ghost"
            className="mt-5 min-h-12"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await manageGuesty({ data: { organizationId: org.id, action: "disconnect" } });
                setProperties([]);
                setSelected([]);
                setNext(0);
              })
            }
          >
            {t("provider.disconnect")}
          </Button>
        </section>
      )}
      {!!created.length && (
        <section className="surface mt-6 p-6">
          <h2 className="text-2xl">{t("provider.drafts")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("provider.photos")}</p>
          {created.map((id) => (
            <Link
              key={id}
              to="/app/p/$id"
              params={{ id }}
              className="btn btn-secondary mt-3 w-full"
            >
              {t("provider.review")}
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
