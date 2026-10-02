import { useEffect, useState } from "react";
import type { PropertyField } from "@/lib/data/properties";
import { friendlyMessage } from "./Friendly";

export function QuestionScreen({
  field,
  onSave,
  onSaved,
  onBack,
  onSkip,
  progress,
}: {
  field: PropertyField;
  onSave: (field: PropertyField, value: string) => Promise<PropertyField>;
  onSaved: (f: PropertyField) => void;
  onBack?: () => void;
  onSkip?: () => void;
  progress?: { i: number; n: number };
}) {
  const [value, setValue] = useState(field.value ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setValue(field.value ?? "");
    setError("");
  }, [field.id, field.value]);
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      onSaved(await onSave(field, value));
    } catch (e) {
      setError(friendlyMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-6">
      {onBack && (
        <button className="min-h-12 font-semibold text-primary" onClick={onBack}>
          ← Retour
        </button>
      )}
      {progress && (
        <>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(progress.i / progress.n) * 100}%` }}
            />
          </div>
          <p className="mt-3 text-muted-foreground">
            Question {progress.i + 1} sur {progress.n}
          </p>
        </>
      )}
      <h1 className="mt-4 text-3xl font-semibold">{field.question ?? field.label}</h1>
      {field.status === "to_verify" && (
        <p className="mt-3 rounded-xl bg-warning-soft p-3">
          Nous avons trouvé ceci, mais ce n'est pas certain. Corrigez si besoin puis validez.
        </p>
      )}
      <textarea
        className="field mt-6 min-h-40 text-lg"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Écrivez ici…"
        autoFocus
      />
      {field.raw_value && field.raw_value !== value && (
        <details className="mt-2 text-muted-foreground">
          <summary className="min-h-12 cursor-pointer py-3">Voir le texte d'origine</summary>
          <p className="whitespace-pre-line">{field.raw_value}</p>
        </details>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-warning-soft p-3">
          {error}
        </p>
      )}
      <button
        className="btn btn-primary mt-4 w-full text-lg"
        disabled={!value.trim() || busy}
        onClick={save}
      >
        {busy ? "Enregistrement…" : "Valider"}
      </button>
      {onSkip && (
        <button className="mt-2 min-h-12 w-full font-medium text-muted-foreground" onClick={onSkip}>
          Je compléterai plus tard
        </button>
      )}
    </div>
  );
}
