export interface Stage {
  id: string;
  label: string;
}

export function ImportProgress({ stages, current }: { stages: Stage[]; current: number }) {
  return (
    <ol className="surface mt-8 space-y-4 p-6" aria-live="polite">
      {stages.map((s, i) => (
        <li
          key={s.id}
          className={`flex items-center gap-3 text-lg ${i > current ? "text-muted-foreground" : ""}`}
        >
          <span
            className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${i < current ? "bg-success text-primary-foreground" : i === current ? "animate-pulse bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            {i < current ? "✓" : i + 1}
          </span>
          {s.label}
        </li>
      ))}
    </ol>
  );
}

/** Advances visually while real work runs; never claims a stage finished before the work does. */
export function useStageTicker() {
  return (set: (n: number) => void, max: number, ms = 900) => {
    let n = 0;
    set(0);
    const t = setInterval(() => {
      n = Math.min(n + 1, max - 1);
      set(n);
    }, ms);
    return () => clearInterval(t);
  };
}
