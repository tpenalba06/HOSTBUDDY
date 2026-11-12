import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useOrg } from "@/components/app/useOrg";
import { Button } from "@/components/ui/button";
import { ImportReview } from "@/components/app/ImportReview";
import { createPropertyFromExtraction } from "@/lib/data/properties";
import { previewPmsImport } from "@/lib/integrations/providers/pms-session.functions";
import {
  extractionFromProvider,
  type NormalizedProperty,
} from "@/lib/integrations/providers/model";
import type { ExtractionResult } from "@/lib/import-engine/types";

export const Route = createFileRoute("/_authenticated/app/import-pms")({ component: PmsImport });
const providers = [
  "guesty",
  "lodgify",
  "hostaway",
  "smoobu",
  "beds24",
  "amenitiz",
  "cloudbeds",
  "mews",
] as const;
const names = {
  guesty: "Guesty",
  lodgify: "Lodgify",
  hostaway: "Hostaway",
  smoobu: "Smoobu",
  beds24: "Beds24",
  amenitiz: "Amenitiz",
  cloudbeds: "Cloudbeds",
  mews: "Mews",
};
type Provider = (typeof providers)[number];
type ReadyProvider = "lodgify" | "hostaway" | "smoobu" | "beds24";
function PmsImport() {
  const org = useOrg();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [provider, setProvider] = useState<Provider>("guesty");
  const [key, setKey] = useState("");
  const [secret, setSecret] = useState("");
  const [rows, setRows] = useState<NormalizedProperty[]>([]);
  const [next, setNext] = useState<number | null>(1);
  const [selected, setSelected] = useState<NormalizedProperty | null>(null);
  const [candidate, setCandidate] = useState<ExtractionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ready = ["lodgify", "hostaway", "smoobu", "beds24"].includes(provider);
  const run = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch {
      setError(
        "La connexion ou l’import n’a pas abouti. Vérifiez vos accès et réessayez. Vos logements existants sont conservés.",
      );
    } finally {
      setBusy(false);
    }
  };
  const fetchRows = (externalId?: string) =>
    previewPmsImport({
      data: {
        organizationId: org.id,
        provider: provider as ReadyProvider,
        key,
        secret: secret || undefined,
        page: next ?? 1,
        externalId,
      },
    });
  if (org.role === "member")
    return <p role="alert">Votre rôle ne permet pas d’importer des logements.</p>;
  if (candidate && selected)
    return (
      <>
        {error && (
          <p role="alert" className="rounded-xl bg-warning-soft p-3">
            {error}
          </p>
        )}
        <ImportReview
          value={candidate}
          onChange={setCandidate}
          busy={busy}
          onBack={() => {
            setCandidate(null);
            setSelected(null);
          }}
          onConfirm={() =>
            void run(async () => {
              const property = await createPropertyFromExtraction(
                org.id,
                "pms",
                candidate,
                `pms:${provider}:${selected.externalId}`,
              );
              await qc.invalidateQueries({ queryKey: ["properties"] });
              setKey("");
              setSecret("");
              await nav({ to: "/app/p/$id", params: { id: property.id } });
            })
          }
        />
      </>
    );
  return (
    <div className="py-6">
      <Link to="/app/new" className="inline-flex min-h-12 items-center text-primary">
        Retour
      </Link>
      <h1 className="mt-2 text-3xl">Connecter mon logiciel</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Import initial en lecture seule. Chaque logement sera vérifié avant de devenir un brouillon.
        Aucune synchronisation automatique n’écrase vos modifications.
      </p>
      <label className="mt-6 block max-w-xl">
        Mon logiciel
        <select
          className="field mt-2"
          disabled={busy}
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value as Provider);
            setRows([]);
            setNext(1);
            setKey("");
            setSecret("");
            setError("");
          }}
        >
          {providers.map((id) => (
            <option key={id} value={id}>
              {names[id]}
            </option>
          ))}
        </select>
      </label>
      {provider === "guesty" ? (
        <Link to="/app/import-guesty" className="btn btn-primary mt-5">
          Ouvrir la connexion Guesty existante
        </Link>
      ) : !ready ? (
        <p className="surface mt-5 max-w-xl p-5">
          {names[provider]} : préparation disponible. L’accès client ou partenaire et le contrat de
          données doivent encore être validés ; aucune connexion opérationnelle n’est annoncée. Vous
          pouvez déjà importer un lien public ou coller le texte de votre livret.
        </p>
      ) : (
        <form
          className="surface mt-5 max-w-xl space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const page = await fetchRows();
              setRows((current) => [
                ...current,
                ...page.properties.filter(
                  (r) => !current.some((p) => p.externalId === r.externalId),
                ),
              ]);
              setNext(page.nextPage);
            });
          }}
        >
          <p className="text-sm text-muted-foreground">
            Vos accès restent uniquement en mémoire pendant cette session et ne sont jamais
            enregistrés par ce parcours. Utilisez des droits de lecture limités aux logements.
          </p>
          <label className="block">
            {provider === "lodgify" || provider === "smoobu"
              ? "Clé API"
              : "Jeton d'accès en lecture"}
            <input
              className="field mt-2"
              disabled={busy}
              type="password"
              autoComplete="off"
              required
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setRows([]);
                setNext(1);
              }}
            />
          </label>
          {provider === "smoobu" && (
            <label className="block">
              Secret API HMAC
              <input
                className="field mt-2"
                disabled={busy}
                type="password"
                autoComplete="off"
                required
                value={secret}
                onChange={(e) => {
                  setSecret(e.target.value);
                  setRows([]);
                  setNext(1);
                }}
              />
            </label>
          )}
          <Button disabled={busy || next === null} className="min-h-12">
            {busy ? "Connexion en cours…" : rows.length ? "Charger la suite" : "Lire mes logements"}
          </Button>
          <Button
            type="button"
            disabled={busy}
            variant="outline"
            onClick={() => {
              setKey("");
              setSecret("");
              setRows([]);
              setNext(1);
            }}
          >
            Effacer mes accès
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-warning-soft p-4">
          {error}
        </p>
      )}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {rows.map((property) => (
          <article key={property.externalId} className="surface p-4">
            <h2 className="text-xl">{property.name || "Logement sans nom"}</h2>
            <Button
              className="mt-3 min-h-12"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const page = await fetchRows(property.externalId);
                  const full = page.properties[0];
                  if (!full) throw new Error("missing_property");
                  setSelected(full);
                  setCandidate({ ...extractionFromProvider(full), photos: [] });
                })
              }
            >
              Analyser ce logement
            </Button>
          </article>
        ))}
      </div>
      {candidate && error && <p role="alert">{error}</p>}
      <p className="mt-5 text-sm text-muted-foreground">
        Les photos PMS ne sont pas copiées automatiquement par ce parcours initial. Leur transfert
        et leurs droits restent à vérifier. Un réimport du même identifiant rouvre le logement
        existant.
      </p>
    </div>
  );
}
