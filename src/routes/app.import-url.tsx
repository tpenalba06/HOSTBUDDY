import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { mockUrlAdapter, URL_STAGES } from "@/lib/import-engine/adapters";
import type { ImportResult } from "@/lib/import-engine/types";
import { ImportProgress } from "@/components/app/ImportProgress";
import { FieldList } from "@/components/app/FieldList";
import { saveDraft } from "@/lib/store";

export const Route = createFileRoute("/app/import-url")({ component: ImportUrl });

function ImportUrl() {
  const nav = useNavigate();
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  const go = async () => {
    if (!mockUrlAdapter.canHandle(url)) return setError("Collez un lien qui commence par https://");
    setError("");
    const r = await mockUrlAdapter.run(url, setStage);
    saveDraft(r); setResult(r);
  };

  if (result) {
    const left = result.fields.filter((f) => f.status !== "found").length;
    return (
      <div className="mt-6">
        <h1 className="text-3xl font-semibold">Voici ce que nous avons préparé</h1>
        <p className="mt-2 rounded-xl bg-warning-soft p-3 text-lg font-medium">Il reste {left} informations à compléter</p>
        <div className="mt-6"><FieldList fields={result.fields} /></div>
        <button className="btn btn-primary sticky bottom-4 mt-6 w-full text-lg" onClick={() => nav({ to: "/app/complete" })}>Compléter ({left})</button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <Link to="/app" className="font-semibold text-primary">← Retour</Link>
      <h1 className="mt-4 text-3xl font-semibold">Collez simplement le lien de votre logement</h1>
      {stage ? <ImportProgress stages={URL_STAGES} current={stage} /> : (
        <div className="mt-6 space-y-4">
          <input className="field text-lg" inputMode="url" placeholder="https://www.airbnb.fr/rooms/…" value={url} onChange={(e) => setUrl(e.target.value)} />
          {error && <p role="alert" className="rounded-xl bg-warning-soft p-3">{error}</p>}
          <button className="btn btn-primary w-full text-lg" onClick={go}>Importer</button>
          <p className="text-center text-muted-foreground">Vous pourrez tout vérifier et modifier avant publication.</p>
        </div>
      )}
    </div>
  );
}
