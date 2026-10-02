import { useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, CircleHelp, Home, MessageSquareQuote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import type { PropertyField } from "@/lib/data/properties";

export type PropertyEditorMode = "guide" | "details" | "services" | "reviews";
export function PropertyEditorScreen({
  property,
  mode,
  onModeChange,
  onBack,
  onPreview,
  onRename,
  onSaved,
  backAction,
  previewAction,
  children,
}: {
  property: { id: string; name: string; status: string };
  mode: PropertyEditorMode;
  onModeChange: (mode: PropertyEditorMode) => void;
  onBack: () => void;
  onPreview: () => void;
  onRename: (name: string) => Promise<void>;
  onSaved: () => void;
  backAction?: ReactNode;
  previewAction?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const tabs = [
    { id: "guide" as const, label: t("app.guide"), icon: BookOpen },
    { id: "details" as const, label: t("app.information"), icon: CircleHelp },
    { id: "services" as const, label: t("app.services"), icon: Home },
    { id: "reviews" as const, label: t("app.reviews"), icon: MessageSquareQuote },
  ];

  return (
    <div className="py-4 @sm:py-6">
      {backAction ?? (
        <Button variant="outline" className="min-h-12 text-primary" onClick={onBack}>
          ← {t("app.myProperties")}
        </Button>
      )}
      <div className="mt-4 grid gap-4 @sm:grid-cols-[minmax(0,1fr)_auto] @sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-3xl font-semibold @sm:text-4xl">{property.name}</h1>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                property.status === "published"
                  ? "bg-success-soft text-success"
                  : "bg-warning-soft text-warning"
              }`}
            >
              {property.status === "published" ? t("app.published") : t("app.draft")}
            </span>
          </div>
          <NameEditor
            key={property.id}
            initial={property.name}
            onRename={onRename}
            onSaved={onSaved}
          />
        </div>

        {property.status === "published" &&
          (previewAction ?? (
            <Button variant="outline" className="min-h-12 w-full @sm:w-auto" onClick={onPreview}>
              {t("app.viewGuide")}
            </Button>
          ))}
      </div>

      <div className="mt-6 grid gap-2 @sm:grid-cols-2 @lg:grid-cols-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = mode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onModeChange(tab.id)}
              aria-pressed={active}
              className={`flex min-h-16 items-center gap-3 rounded-2xl border px-4 text-left font-semibold transition ${
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-soft"
                  : "bg-card hover:border-primary"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}

function NameEditor({
  onRename,
  initial,
  onSaved,
}: {
  onRename: (name: string) => Promise<void>;
  initial: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(t.current), []);
  return (
    <label className="mt-2 block max-w-xl">
      <span className="sr-only">Nom de l’hébergement</span>
      <input
        className="w-full border-0 bg-transparent p-0 text-sm font-medium text-muted-foreground outline-none transition focus:text-foreground @sm:text-base"
        value={name}
        onChange={(e) => {
          const v = e.target.value;
          setName(v);
          clearTimeout(t.current);
          t.current = setTimeout(
            () =>
              onRename(v)
                .then(onSaved)
                .catch(() => {}),
            700,
          );
        }}
        aria-label="Nom de l’hébergement"
      />
    </label>
  );
}

const BADGE_CLASS = {
  found: "bg-success-soft text-success",
  to_verify: "bg-warning-soft text-warning",
  missing: "bg-muted text-muted-foreground",
} as const;
export function PropertyInformationScreen({
  fields,
  onEdit,
  onComplete,
}: {
  fields: PropertyField[];
  onEdit: (field: PropertyField) => void;
  onComplete: () => void;
}) {
  const { t } = useI18n();
  const remaining = fields.filter((f) => f.essential && f.status !== "found").length;
  const found = fields.filter((f) => f.status === "found");
  return (
    <>
      <div className={`mt-5 rounded-2xl p-4 ${remaining ? "bg-warning-soft" : "bg-success-soft"}`}>
        <div className="flex items-center justify-between gap-3">
          <strong className="text-lg">
            {remaining
              ? `${remaining} info${remaining > 1 ? "s" : ""} à compléter`
              : "Tout est prêt"}
          </strong>
          <span className="text-sm font-semibold text-muted-foreground">
            {found.length}/{fields.length}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-background/80">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.round((found.length / Math.max(fields.length, 1)) * 100)}%` }}
          />
        </div>
      </div>
      <button className="btn btn-primary mt-4 w-full text-lg" onClick={onComplete}>
        {remaining ? `${t("property.complete")} (${remaining})` : t("property.publishNext")}
      </button>
      <ul className="mt-8 space-y-3">
        {fields.map((f) => (
          <li key={f.id} className="surface p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">
                {f.label}
                {f.essential && (
                  <span className="text-muted-foreground"> · {t("property.important")}</span>
                )}
              </span>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${BADGE_CLASS[f.status]}`}
              >
                {t(`property.${f.status === "to_verify" ? "verify" : f.status}`)}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-line">
              {f.value ?? <span className="text-muted-foreground">{t("property.none")}</span>}
            </p>
            <button
              className="mt-2 min-h-12 font-semibold text-primary underline"
              onClick={() => onEdit(f)}
            >
              {f.value
                ? f.status === "to_verify"
                  ? t("property.verify")
                  : t("common.edit")
                : t("property.add")}
            </button>
          </li>
        ))}
      </ul>{" "}
    </>
  );
}
