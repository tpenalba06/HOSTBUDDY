import { FIELD_DEFS } from "@/lib/import-engine/fields";
import type { ExtractionResult } from "@/lib/import-engine/types";
import { useI18n } from "@/lib/i18n";

const BADGE_CLASS = {
  found: "bg-success-soft text-success",
  to_verify: "bg-warning-soft text-warning",
  missing: "bg-muted text-muted-foreground",
} as const;

export function ImportReview({
  value,
  onChange,
  onConfirm,
  onBack,
  busy = false,
}: {
  value: ExtractionResult;
  onChange: (next: ExtractionResult) => void;
  onConfirm: () => void;
  onBack: () => void;
  busy?: boolean;
}) {
  const { t } = useI18n();

  const found = value.fields.filter((field) => field.status === "found").length;
  const verify = value.fields.filter((field) => field.status === "to_verify").length;
  const missing = value.fields.filter((field) => field.status === "missing").length;
  const essentialMissing = value.fields.filter((field) => {
    const def = FIELD_DEFS.find((item) => item.key === field.key);
    return def?.essential && field.status !== "found";
  }).length;

  const updateName = (propertyName: string) => onChange({ ...value, propertyName });

  const updateField = (key: string, nextValue: string) => {
    onChange({
      ...value,
      fields: value.fields.map((field) => {
        if (field.key !== key) return field;
        const trimmed = nextValue.trim();
        return {
          ...field,
          value: trimmed || null,
          status: trimmed ? "found" : "missing",
          confidence: trimmed ? 1 : 0,
          manuallyVerified: Boolean(trimmed),
          manuallyOverridden: true,
        };
      }),
    });
  };

  return (
    <div className="mt-6">
      <button className="min-h-12 font-semibold text-primary" onClick={onBack} disabled={busy}>
        ← {t("common.back")}
      </button>

      <div className="mt-2">
        <p className="font-bold text-primary">HostBuddy</p>
        <h1 className="mt-1 text-3xl font-semibold">{t("importFlow.reviewTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("importFlow.reviewHelp")}</p>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-success-soft p-3">
          <p className="text-sm font-semibold text-success">{t("property.found")}</p>
          <p className="text-2xl font-semibold">{found}</p>
        </div>
        <div className="rounded-xl bg-warning-soft p-3">
          <p className="text-sm font-semibold text-warning">{t("property.verify")}</p>
          <p className="text-2xl font-semibold">{verify}</p>
        </div>
        <div className="rounded-xl bg-muted p-3">
          <p className="text-sm font-semibold text-muted-foreground">{t("property.missing")}</p>
          <p className="text-2xl font-semibold">{missing}</p>
        </div>
      </div>

      {essentialMissing > 0 && (
        <p className="mt-4 rounded-xl bg-warning-soft p-3 font-medium">
          {t("importFlow.importantMissing").replace("{count}", String(essentialMissing))}
        </p>
      )}

      <label className="mt-6 block">
        <span className="mb-1 block font-semibold">{t("importFlow.propertyName")}</span>
        <input
          className="field text-lg"
          value={value.propertyName ?? ""}
          placeholder={t("importFlow.propertyPlaceholder")}
          onChange={(event) => updateName(event.target.value)}
        />
      </label>

      {!!value.photos?.length && (
        <section className="surface mt-6 p-4">
          <h2 className="text-xl">{t("importFlow.photos")}</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {value.photos.map((url) => (
              <img
                key={url}
                src={url}
                alt={t("importFlow.photoAlt")}
                referrerPolicy="no-referrer"
                className="aspect-square w-full rounded-xl object-cover"
              />
            ))}
          </div>
          <label className="mt-4 flex items-center gap-3">
            <input
              type="checkbox"
              className="h-6 w-6"
              checked={value.photoRightsConfirmed ?? false}
              onChange={(e) => onChange({ ...value, photoRightsConfirmed: e.target.checked })}
            />
            <span>{t("importFlow.photoRights")}</span>
          </label>
        </section>
      )}
      <div className="mt-6 space-y-3">
        {FIELD_DEFS.map((def) => {
          const field = value.fields.find((item) => item.key === def.key);
          if (!field) return null;
          return (
            <article key={def.key} className="surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {t(`field.${def.key}`)}
                    {def.essential && (
                      <span className="text-sm text-muted-foreground">
                        {" "}
                        · {t("property.important")}
                      </span>
                    )}
                  </p>
                  {field.rawValue && field.rawValue !== field.value && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("importFlow.sourceSaved")}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${BADGE_CLASS[field.status]}`}
                >
                  {t(`property.${field.status === "to_verify" ? "verify" : field.status}`)}
                </span>
              </div>

              <textarea
                className="field mt-3 min-h-24"
                value={field.value ?? ""}
                placeholder={t("importFlow.fieldPrompt").replace("{label}", t(`field.${def.key}`))}
                aria-label={t(`field.${def.key}`)}
                onChange={(event) => updateField(def.key, event.target.value)}
              />

              {field.rawValue && (
                <details className="mt-2 text-sm text-muted-foreground">
                  <summary className="cursor-pointer py-2 font-medium">
                    {t("importFlow.sourceText")}
                  </summary>
                  <p className="whitespace-pre-line rounded-lg bg-muted p-3">{field.rawValue}</p>
                </details>
              )}
            </article>
          );
        })}
      </div>

      <button
        className="btn btn-primary mt-6 w-full text-lg"
        onClick={onConfirm}
        disabled={busy || !value.propertyName?.trim()}
      >
        {busy ? t("importFlow.creating") : t("importFlow.create")}
      </button>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        {t("importFlow.manualReview")}
      </p>
    </div>
  );
}
