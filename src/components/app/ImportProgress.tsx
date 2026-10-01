import type { ImportStage } from "@/lib/import-engine/types";

export function ImportProgress({ stages, current }: { stages: ImportStage[]; current: string }) {
  const idx = stages.findIndex((s) => s.id === current);
  return (
    <ol className="surface mt-8 space-y-4 p-6" aria-live="polite">
      {stages.map((s, i) => (
        <li key={s.id} className={`flex items-center gap-3 text-lg ${i > idx ? "text-muted-foreground" : ""}`}>
          <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${i < idx ? "bg-success text-primary-foreground" : i === idx ? "animate-pulse bg-primary text-primary-foreground" : "bg-muted"}`}>
            {i < idx ? "✓" : i + 1}
          </span>
          {s.label}
        </li>
      ))}
    </ol>
  );
}
