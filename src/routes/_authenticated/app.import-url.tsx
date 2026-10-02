import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { normalizeUrl, pickAdapter } from "@/lib/import-engine/url-adapters";
import type { ExtractionResult, ImportSource } from "@/lib/import-engine/types";
import {
  createPropertyFromExtraction,
  finishImportRun,
  startImportRun,
} from "@/lib/data/properties";
import { ImportProgress, useStageTicker } from "@/components/app/ImportProgress";
import { ImportReview } from "@/components/app/ImportReview";
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
  const [candidate, setCandidate] = useState<ExtractionResult | null>(null);
  const [source, setSource] = useState<ImportSource>("website");
  const [cleanUrl, setCleanUrl] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    const clean = normalizeUrl(url);
    if (!clean)
      return setError("Ce lien ne semble pas complet. Copiez-le depuis la barre d'adresse.");

    setError("");
    setFallback(false);
    setCandidate(null);
    const stop = tick(setStage, STAGES.length);
    const adapter = pickAdapter(clean);
    let currentRunId: string | null = null;

    try {
      currentRunId = await startImportRun(org.id, adapter.source, { url: clean });
      setRunId(currentRunId);
      const outcome = await adapter.run(clean).catch(() => ({
        ok: false as const,
        source: adapter.source,
        reason: "unreachable" as const,
      }));

      stop();
      setStage(null);

      if (!outcome.ok) {
        await finishImportRun(
          currentRunId,
          outcome.reason === "insufficient" ? "insufficient" : "failed",
          { error: outcome.reason },
        );
        setRunId(null);
        setFallback(true);
        return;
      }

      setSource(adapter.source);
      setCleanUrl(clean);
      setCandidate(outcome.result);
    } catch (e) {
      if (currentRunId) await finishImportRun(currentRunId, "failed", { error: "client" }).catch(() => {});
      stop();
      setStage(null);
      setRunId(null);
      setError(friendlyMessage(e));
    }
  };

  const confirm = async () => {
    if (!candidate || !cleanUrl) return;
    setBusy(true);
    setError("");
    try {
      const property = await createPropertyFromExtraction(org.id, source, candidate, cleanUrl);
      if (runId) await finishImportRun(runId, "succeeded", { propertyId: property.id });
      qc.invalidateQueries({ queryKey: ["properties"] });
      nav({ to: "/app/p/$id", params: { id: property.id } });
    } catch (e) {
      if (runId) await finishImportRun(runId, "failed", { error: "create_property" }).catch(() => {});
      setError(friendlyMessage(e));
      setBusy(false);
    }
  };

  const backFromReview = async () => {
    if (runId) await finishImportRun(runId, "insufficient", { error: "review_cancelled" }).catch(() => {});
    setRunId(null);
    setCandidate(null);
    setCleanUrl(null);
  };

  if (candidate) {
    return (
      <>
        {error && <p role="alert" className="mt-4 rounded-xl bg-warning-soft p-3">{error}</p>}
        <ImportReview
          value={candidate}
          onChange={setCandidate}
          onConfirm={confirm}
          onBack={backFromReview}
          busy={busy}
        />
      </>
    );
  }

  if (fallback) {
    return (
      <div className="mt-6">
        <p className="text-4xl">🔍</p>
        <h1 className="mt-2 text-3xl font-semibold">{t("import.fallbackTitle")}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{t("import.fallbackText")}</p>
        <Link to="/app/import-text" className="btn btn-primary mt-8 w-full text-lg">
          {t("import.fallbackPrimary")}
        </Link>
        <Link to="/app/manual" className="btn btn-secondary mt-3 w-full">
          {t("import.fallbackSecondary")}
        </Link>
        <button
          className="mt-3 min-h-12 w-full font-medium text-muted-foreground underline"
          onClick={() => setFallback(false)}
        >
          Essayer un autre lien
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <Link to="/app" className="inline-block min-h-12 py-3 font-semibold text-primary">
        ← {t("common.back")}
      </Link>
      <h1 className="text-3xl font-semibold">{t("import.urlTitle")}</h1>
      {stage !== null ? (
        <ImportProgress stages={STAGES} current={stage} />
      ) : (
        <div className="mt-6 space-y-4">
          <input
            className="field text-lg"
            inputMode="url"
            autoComplete="url"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go()}
          />
          {error && (
            <p role="alert" className="rounded-xl bg-warning-soft p-3">
              {error}
            </p>
          )}
          <button className="btn btn-primary w-full text-lg" onClick={go} disabled={!url.trim()}>
            {t("import.action")}
          </button>
          <p className="text-center text-muted-foreground">{t("import.urlHelp")}</p>
        </div>
      )}
    </div>
  );
}
