import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { extractDocument, MAX_IMPORT_CHARACTERS } from "@/lib/import-engine/document-extractor";
import { importFromText } from "@/lib/import-engine/text-import.functions";
import type { ExtractionResult } from "@/lib/import-engine/types";
import {
  createPropertyFromExtraction,
  finishImportRun,
  startImportRun,
} from "@/lib/data/properties";
import { ImportProgress, useStageTicker } from "@/components/app/ImportProgress";
import { ImportReview } from "@/components/app/ImportReview";
import { useOrg } from "@/components/app/useOrg";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/app/import-text")({ component: ImportText });

const STAGE_KEYS = ["readText", "sort", "uncertain", "review"] as const;

const EXAMPLE = `Villa des Oliviers
Bienvenue dans notre maison lumineuse avec vue mer, 12 chemin des Pins 06160 Antibes.
Arrivée à partir de 16h. Les clés sont dans la boîte à clés à droite du portail, code 1907.
Wifi : Oliviers_5G / mdp soleil2026
On peut se garer devant la maison, 2 places. Parking public à 200m peut-être payant ?
Piscine ouverte de 9h à 21h, douche obligatoire avant la baignade.
La clim se règle avec la télécommande blanche dans le salon.
Lave-vaisselle et machine Nespresso dans la cuisine.
Non fumeur, pas de fêtes, animaux acceptés sur demande.
Poubelles : conteneurs au bout de la rue, tri sélectif (jaune = recyclable).
Départ avant 11h, laisser les clés dans la boîte.
Pour me joindre : Marie 06 12 34 56 78 (WhatsApp ok) ou marie@exemple.fr
En cas d'urgence : 112. Pharmacie de garde place du marché.
Nos adresses : boulangerie Lou Fournil, restaurant Le Cabanon sur la plage.
Petit-déjeuner livré possible sur demande.`;

function ImportText() {
  const { t } = useI18n();
  const stages = STAGE_KEYS.map((key) => ({ id: key, label: t(`importFlow.${key}`) }));
  const org = useOrg();
  const nav = useNavigate();
  const qc = useQueryClient();
  const tick = useStageTicker();
  const [text, setText] = useState("");
  const [stage, setStage] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [candidate, setCandidate] = useState<ExtractionResult | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setError("");
    setCandidate(null);
    const stop = tick(setStage, stages.length, 500);
    let currentRunId: string | null = null;

    try {
      if (text.length > MAX_IMPORT_CHARACTERS) throw new Error("import_text_too_large");
      currentRunId = await startImportRun(org.id, "text", { rawText: text });
      setRunId(currentRunId);
      const result = await importFromText({ data: { text } }).catch(() => {
        const fallback = extractDocument(text);
        fallback.analysis!.warnings.push("analysis_service_unavailable");
        return fallback;
      });
      const useful = result.fields.filter((field) => field.status !== "missing").length;

      stop();
      setStage(null);

      if (!result.propertyName && useful === 0) {
        await finishImportRun(currentRunId, "insufficient", { error: "no_fields_detected" });
        setRunId(null);
        setError(t("importFlow.notEnough"));
        return;
      }

      setCandidate(result);
    } catch {
      if (currentRunId)
        await finishImportRun(currentRunId, "failed", { error: "client" }).catch(() => {});
      stop();
      setStage(null);
      setRunId(null);
      setError(t("errors.body"));
    }
  };

  const confirm = async () => {
    if (!candidate) return;
    setBusy(true);
    setError("");
    try {
      const property = await createPropertyFromExtraction(org.id, "text", candidate, null);
      if (runId) await finishImportRun(runId, "succeeded", { propertyId: property.id });
      qc.invalidateQueries({ queryKey: ["properties"] });
      nav({ to: "/app/p/$id", params: { id: property.id } });
    } catch {
      if (runId)
        await finishImportRun(runId, "failed", { error: "create_property" }).catch(() => {});
      setError(t("errors.body"));
      setBusy(false);
    }
  };

  const backFromReview = async () => {
    if (runId)
      await finishImportRun(runId, "insufficient", { error: "review_cancelled" }).catch(() => {});
    setRunId(null);
    setCandidate(null);
  };

  if (candidate) {
    return (
      <>
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-warning-soft p-3">
            {error}
          </p>
        )}
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

  return (
    <div className="mt-6">
      <Link to="/app" className="inline-block min-h-12 py-3 font-semibold text-primary">
        ← {t("common.back")}
      </Link>
      <h1 className="text-3xl font-semibold">{t("import.textTitle")}</h1>
      <p className="mt-2 text-lg text-muted-foreground">{t("import.textHelp")}</p>
      {stage !== null ? (
        <ImportProgress stages={stages} current={stage} />
      ) : (
        <div className="mt-6 space-y-4">
          <label className="block text-sm font-semibold">
            Charger un fichier texte ou HTML
            <input
              className="mt-2 block w-full text-sm"
              type="file"
              accept=".txt,.md,.html,.htm,text/plain,text/markdown,text/html"
              onChange={async (event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (!file) return;
                setError("");
                try {
                  if (file.size > 1_000_000 || !/\.(txt|md|html?)$/i.test(file.name))
                    throw new Error("unsupported_document");
                  let content = await file.text();
                  if (content.includes("\0")) throw new Error("unsupported_document");
                  if (/\.html?$/i.test(file.name))
                    content = (await import("@/lib/import-engine/html-document")).htmlDocumentText(
                      content,
                    );
                  if (content.length > MAX_IMPORT_CHARACTERS)
                    throw new Error("import_text_too_large");
                  setText(content);
                } catch {
                  setError(
                    "Ce fichier ne peut pas être lu ici. Utilisez un fichier texte ou HTML de moins de 200 000 caractères, ou collez le texte de votre document.",
                  );
                }
              }}
            />
          </label>
          <textarea
            className="field min-h-72 text-lg"
            placeholder={t("importFlow.placeholder")}
            aria-label={t("import.textTitle")}
            value={text}
            maxLength={MAX_IMPORT_CHARACTERS}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            className="min-h-12 font-semibold text-primary underline"
            onClick={() => setText(EXAMPLE)}
          >
            {t("importFlow.example")}
          </button>
          {error && (
            <p role="alert" className="rounded-xl bg-warning-soft p-3">
              {error}
            </p>
          )}
          <button className="btn btn-primary w-full text-lg" disabled={!text.trim()} onClick={go}>
            {t("import.textAction")}
          </button>
          <p className="text-center text-sm text-muted-foreground">{t("importFlow.languages")}</p>
        </div>
      )}
    </div>
  );
}
