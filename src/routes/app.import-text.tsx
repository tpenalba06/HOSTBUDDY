import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { textAdapter, TEXT_STAGES } from "@/lib/import-engine/adapters";
import type { ImportResult } from "@/lib/import-engine/types";
import { ImportProgress } from "@/components/app/ImportProgress";
import { FieldList } from "@/components/app/FieldList";
import { saveDraft } from "@/lib/store";

export const Route = createFileRoute("/app/import-text")({ component: ImportText });

const EXAMPLE = `Arrivée à partir de 16h, les clés sont dans la boîte à côté du portail (code 1907).
Wifi : VillaMare_5G / mdp soleil2026
On peut se garer devant la maison, 2 places.
Piscine ouverte de 9h à 21h, douche obligatoire.
Départ avant 11h, laisser les clés dans la boîte.
Pour me joindre : 06 12 34 56 78 (WhatsApp ok)`;

function ImportText() {
  const nav = useNavigate();
  const [text, setText] = useState("");
  const [stage, setStage] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const go = async () => { const r = await textAdapter.run(text, setStage); saveDraft(r); setResult(r); };

  if (result) {
    const left = result.fields.filter((f) => f.status !== "found").length;
    return (
      <div className="mt-6">
        <h1 className="text-3xl font-semibold">Voici comment nous avons rangé votre texte</h1>
        <p className="mt-2 text-muted-foreground">Rien n'est publié tant que vous n'avez pas confirmé.</p>
        <div className="mt-6"><FieldList fields={result.fields} /></div>
        <button className="btn btn-primary sticky bottom-4 mt-6 w-full text-lg" onClick={() => nav({ to: "/app/complete" })}>
          {left ? `Vérifier et compléter (${left})` : "Tout est bon, continuer"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <Link to="/app" className="font-semibold text-primary">← Retour</Link>
      <h1 className="mt-4 text-3xl font-semibold">Collez tout ce que vous avez. Même si c'est mal rangé.</h1>
      <p className="mt-2 text-lg text-muted-foreground">HostBuddy s'occupe du reste.</p>
      {stage ? <ImportProgress stages={TEXT_STAGES} current={stage} /> : (
        <div className="mt-6 space-y-4">
          <textarea className="field min-h-72 text-lg" placeholder="Vos notes, un message WhatsApp, un e-mail, un ancien livret…" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="min-h-12 font-semibold text-primary underline" onClick={() => setText(EXAMPLE)}>Essayer avec un exemple</button>
          <button className="btn btn-primary w-full text-lg" disabled={!text.trim()} onClick={go}>Ranger mes informations</button>
        </div>
      )}
    </div>
  );
}
