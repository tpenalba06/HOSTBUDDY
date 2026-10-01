import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { normalizeUrl, pickAdapter } from "@/lib/import-engine/url-adapters";
import { createPropertyFromExtraction, finishImportRun, startImportRun } from "@/lib/data/properties";
import { ImportProgress, useStageTicker } from "@/components/app/ImportProgress";
import { useOrg } from "@/components/app/useOrg";
import { friendlyMessage } from "@/components/app/Friendly";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/app/import-url")({ component: ImportUrl });

const STAGES = [
  { id: "read", label: "Lecture du logement" },
  { id: "name", label: "Recherche du nom" },
  { id: "description", label: "Recherche de la description" },
  { id: "equipment", label: "Recherche des équipements" },
  { id: "organize", label: "Informations organisées" },
];

function ImportUrl() {
  const { t } = useI18n();
  const org = useOrg();
  const nav = useNavigate();
  const qc = useQueryClient();
  const tick = useStageTicker();
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState(false);

  const go = async () => {
    const clean = normalizeUrl(url);
    if (!clean) return setError("Ce lien ne semble pas complet. Copiez-le depuis la barre d'adresse.");
    setError(""); setFallback(false);
    const stop = tick(setStage, STAGES.length);
    const adapter = pickAdapter(clean);
    let runId: string | null = null;
    try {
      runId = await startImportRun(org.id, adapter.source, { url: clean });
      const outcome = await adapter.run(clean).catch(() => ({ ok: false as const, source: adapter.source, reason: "unreachable" as const }));
      if (!outcome.ok) {
        await finishImportRun(runId, outcome.reason === "insufficient" ? "insufficient" : "failed", { error: outcome.reason });
        stop(); setStage(null); setFallback(true);
        return;
      }
      const property = await createPropertyFromExtraction(org.id, adapter.source, outcome.result, clean);
      await finishImportRun(runId, "succeeded", { propertyId: property.id });
      stop(); setStage(STAGES.length);
      qc.invalidateQueries({ queryKey: ["properties"] });
      nav({ to: "/app/p/$id", params: { id: property.id } });
    } catch (e) {
      if (runId) await finishImportRun(runId, "failed", { error: "client" }).catch(() => {});
      stop(); setStage(null); setError(friendlyMessage(e));
    }
  };

  if (fallback) {
    return (
      <div className="mt-6">
        <p className="text-4xl">🔍</p>
        <h1 className="mt-2 text-3xl font-semibold">Nous n'avons pas pu récupérer suffisamment d'informations depuis ce lien.</h1>
        <p className="mt-3 text-lg text-muted-foreground">Certains sites ne se laissent pas lire automatiquement. Pas de souci : copiez le texte de votre annonce, on s'occupe du reste.</p>
        <Link to="/app/import-text" className="btn btn-primary mt-8 w-full text-lg">Coller le texte de l'annonce</Link>
        <Link to="/app/manual" className="btn btn-secondary mt-3 w-full">Ajouter les informations moi-même</Link>
        <button className="mt-3 min-h-12 w-full font-medium text-muted-foreground underline" onClick={() => setFallback(false)}>Essayer un autre lien</button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <Link to="/app" className="inline-block min-h-12 py-3 font-semibold text-primary">← {t("common.back")}</Link>
      <h1 className="text-3xl font-semibold">Collez simplement le lien de votre logement</h1>
      {stage !== null ? <ImportProgress stages={STAGES} current={stage} /> : (
        <div className="mt-6 space-y-4">
          <input className="field text-lg" inputMode="url" autoComplete="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
          {error && <p role="alert" className="rounded-xl bg-warning-soft p-3">{error}</p>}
          <button className="btn btn-primary w-full text-lg" onClick={go} disabled={!url.trim()}>Importer</button>
          <p className="text-center text-muted-foreground">Vous pourrez tout vérifier et modifier avant publication.</p>
        </div>
      )}
    </div>
  );
}
