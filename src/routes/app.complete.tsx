import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { getDraft, saveDraft } from "@/lib/store";

export const Route = createFileRoute("/app/complete")({ component: Complete });

function QrPlaceholder() {
  const cells = useMemo(() => Array.from({ length: 21 * 21 }, (_, i) => ((i * 7919) % 13) < 6 || i % 21 < 3 && i < 63), []);
  return (
    <div className="mx-auto grid w-56 grid-cols-[repeat(21,1fr)] gap-0 rounded-2xl bg-card p-4 shadow-phone" aria-label="QR code de votre livret">
      {cells.map((on, i) => <span key={i} className={`aspect-square ${on ? "bg-ink" : ""}`} />)}
    </div>
  );
}

function Complete() {
  const [draft, setDraft] = useState(getDraft);
  const todo = useMemo(() => draft?.fields.filter((f) => f.status !== "found").map((f) => f.key) ?? [], []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const field = draft?.fields.find((f) => f.key === todo[i]);
  const [value, setValue] = useState(field?.value ?? "");

  if (!draft) return <p className="mt-10">Aucun logement en cours. <Link to="/app" className="text-primary underline">Commencer</Link></p>;

  const next = (answer: string | null) => {
    const fields = draft.fields.map((f) => f.key === field!.key && answer != null
      ? { ...f, value: answer, status: "found" as const, provenance: { ...f.provenance, manuallyVerified: true, manuallyOverridden: answer !== f.value } }
      : f);
    const d = { ...draft, fields }; saveDraft(d); setDraft(d);
    const nf = d.fields.find((f) => f.key === todo[i + 1]);
    setValue(nf?.value ?? ""); setI(i + 1);
  };

  if (!field) {
    return (
      <div className="mt-8 text-center">
        <p className="text-5xl">🎉</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Votre livret est prêt</h1>
        <p className="mt-2 text-muted-foreground">Imprimez ce QR code et posez-le dans le logement.</p>
        <div className="my-8"><QrPlaceholder /></div>
        <div className="mx-auto grid max-w-sm gap-3">
          <Link to="/l/$slug" params={{ slug: "villa-mare" }} className="btn btn-primary text-lg">Voir mon livret</Link>
          <button className="btn btn-secondary" onClick={() => alert("Le téléchargement du QR arrive bientôt.")}>Télécharger le QR</button>
          <Link to="/app" className="btn btn-secondary">Continuer la personnalisation</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(i / todo.length) * 100}%` }} /></div>
      <p className="mt-3 text-muted-foreground">Question {i + 1} sur {todo.length}</p>
      <h1 className="mt-4 text-3xl font-semibold">{field.question ?? field.label}</h1>
      {field.status === "to_verify" && <p className="mt-2 rounded-xl bg-warning-soft p-3">Nous avons trouvé cette information, mais elle est à vérifier.</p>}
      <textarea className="field mt-6 min-h-36 text-lg" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Écrivez ici…" autoFocus />
      <button className="btn btn-primary mt-4 w-full text-lg" disabled={!value.trim()} onClick={() => next(value.trim())}>Valider</button>
      <button className="mt-2 min-h-12 w-full font-medium text-muted-foreground" onClick={() => next(null)}>Je compléterai plus tard</button>
    </div>
  );
}
