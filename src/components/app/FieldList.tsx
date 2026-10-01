import { CATEGORY_LABELS, type ImportedField } from "@/lib/import-engine/types";

const BADGE = {
  found: ["Trouvé", "bg-success-soft text-success"],
  to_verify: ["À vérifier", "bg-warning-soft text-warning"],
  missing: ["Manquant", "bg-muted text-muted-foreground"],
} as const;

export function FieldList({ fields }: { fields: ImportedField[] }) {
  return (
    <ul className="space-y-3">
      {fields.map((f) => (
        <li key={f.key} className="surface p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{CATEGORY_LABELS[f.category]} · {f.label}</span>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${BADGE[f.status][1]}`}>{BADGE[f.status][0]}</span>
          </div>
          <p className="mt-2">{f.value ?? <span className="text-muted-foreground">Pas encore d'information</span>}</p>
        </li>
      ))}
    </ul>
  );
}
