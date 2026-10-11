import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { rulesExtractor } from "@/lib/import-engine/rules-extractor";
import {
  createPropertyFromExtraction,
  finishImportRun,
  startImportRun,
} from "@/lib/data/properties";
import { ImportProgress, useStageTicker } from "@/components/app/ImportProgress";
import { useOrg } from "@/components/app/useOrg";
import { friendlyMessage } from "@/components/app/Friendly";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/app/import-text")({ component: ImportText });

const STAGES = [
  { id: "read", label: "Lecture de votre texte" },
  { id: "sort", label: "Tri par thème" },
  { id: "save", label: "Enregistrement" },
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

  const go = async () => {
    setError("");
    const stop = tick(setStage, STAGES.length, 600);
    let runId: string | null = null;
    try {
      runId = await startImportRun(org.id, "text", { rawText: text.slice(0, 100_000) });
      const result = await rulesExtractor.extract(text);
      const property = await createPropertyFromExtraction(org.id, "text", result, null);
      await finishImportRun(runId, "succeeded", { propertyId: property.id });
      stop();
      qc.invalidateQueries({ queryKey: ["properties"] });
      nav({ to: "/app/p/$id", params: { id: property.id } });
    } catch (e) {
      if (runId) await finishImportRun(runId, "failed", { error: "client" }).catch(() => {});
      stop();
      setStage(null);
      setError(friendlyMessage(e));
    }
  };

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
        </div>
      )}
    </div>
  );
}
