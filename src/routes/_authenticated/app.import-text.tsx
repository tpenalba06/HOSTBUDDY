import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { rulesExtractor } from "@/lib/import-engine/rules-extractor";
import type { ExtractionResult } from "@/lib/import-engine/types";
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

export const Route = createFileRoute("/_authenticated/app/import-text")({ component: ImportText });

const STAGES = [
  { id: "read", label: "Lecture de votre texte" },
  { id: "sort", label: "Tri par thème" },
  { id: "verify", label: "Détection des informations incertaines" },
  { id: "review", label: "Préparation de la vérification" },
];

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
    const stop = tick(setStage, STAGES.length, 500);
    let currentRunId: string | null = null;

    try {
      currentRunId = await startImportRun(org.id, "text", { rawText: text.slice(0, 100_000) });
      setRunId(currentRunId);
      const result = await rulesExtractor.extract(text);
      const useful = result.fields.filter((field) => field.status !== "missing").length;

      stop();
      setStage(null);

      if (!result.propertyName && useful === 0) {
        await finishImportRun(currentRunId, "insufficient", { error: "no_fields_detected" });
        setRunId(null);
        setError(
          "Nous n’avons pas trouvé assez d’informations. Ajoutez davantage de texte ou créez le logement manuellement.",
        );
        return;
      }

      setCandidate(result);
    } catch (e) {
      if (currentRunId)
        await finishImportRun(currentRunId, "failed", { error: "client" }).catch(() => {});
      stop();
      setStage(null);
      setRunId(null);
      setError(friendlyMessage(e));
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
    } catch (e) {
      if (runId)
        await finishImportRun(runId, "failed", { error: "create_property" }).catch(() => {});
      setError(friendlyMessage(e));
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
        <ImportProgress stages={STAGES} current={stage} />
      ) : (
        <div className="mt-6 space-y-4">
          <textarea
            className="field min-h-72 text-lg"
            placeholder="Vos notes, un message WhatsApp, un e-mail, le texte de votre annonce…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            className="min-h-12 font-semibold text-primary underline"
            onClick={() => setText(EXAMPLE)}
          >
            Essayer avec un exemple
          </button>
          {error && (
            <p role="alert" className="rounded-xl bg-warning-soft p-3">
              {error}
            </p>
          )}
          <button className="btn btn-primary w-full text-lg" disabled={!text.trim()} onClick={go}>
            {t("import.textAction")}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Français, anglais, espagnol, allemand, italien et portugais sont reconnus.
          </p>
        </div>
      )}
    </div>
  );
}
