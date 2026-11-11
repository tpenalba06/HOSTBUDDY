import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getImportUrlIssue, normalizeUrl, pickAdapter } from "@/lib/import-engine/url-adapters";
import {
  createPropertyFromExtraction,
  finishImportRun,
  startImportRun,
} from "@/lib/data/properties";
import { ImportProgress, useStageTicker } from "@/components/app/ImportProgress";
import { useOrg } from "@/components/app/useOrg";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/app/import-url")({ component: ImportUrl });

const STAGE_KEYS = ["readUrl", "name", "description", "equipment", "organize"] as const;

function ImportUrl() {
  const { locale, t } = useI18n();
  const stages = STAGE_KEYS.map((key) => ({ id: key, label: t(`importFlow.${key}`) }));
  const org = useOrg();
  const nav = useNavigate();
  const qc = useQueryClient();
  const tick = useStageTicker();
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState(false);
  const [photoRights, setPhotoRights] = useState(false);
  const importing = useRef(false);

  const go = async () => {
    if (importing.current) return;
    const issue = getImportUrlIssue(url);
    if (issue === "airbnb_search_without_single_listing") {
      setFallback(false);
      return setError(t("importFlow.searchLink"));
    }

    if (issue === "sunver_staff_link") {
      setFallback(false);
      return setError(
        locale === "fr"
          ? "Ce lien Sunver est réservé au personnel. Copie le lien de partage du livret voyageur."
          : "This Sunver link is for staff. Copy the guest guide’s share link.",
      );
    }
    const clean = normalizeUrl(url);
    if (!clean) return setError(t("importFlow.invalidLink"));

    setError("");
    setFallback(false);
    importing.current = true;
    const stop = tick(setStage, stages.length);
    const adapter = pickAdapter(clean);
    let currentRunId: string | null = null;

    try {
      currentRunId = await startImportRun(org.id, adapter.source, { url: clean }).catch(() => null);
      const outcome = await adapter.run(clean).catch(() => ({
        ok: false as const,
        source: adapter.source,
        reason: "unreachable" as const,
      }));

      if (!outcome.ok) {
        if (currentRunId)
          await finishImportRun(
            currentRunId,
            outcome.reason === "insufficient" ? "insufficient" : "failed",
            { error: outcome.reason },
          ).catch(() => {});
        setFallback(true);
        return;
      }

      const property = await createPropertyFromExtraction(
        org.id,
        outcome.source,
        { ...outcome.result, photoRightsConfirmed: photoRights },
        clean,
      );
      if (currentRunId)
        void finishImportRun(currentRunId, "succeeded", { propertyId: property.id }).catch(
          () => {},
        );
      void qc.invalidateQueries({ queryKey: ["properties"] });
      await nav({ to: "/app/p/$id", params: { id: property.id } });
    } catch {
      if (currentRunId)
        void finishImportRun(currentRunId, "failed", { error: "create_property" }).catch(() => {});
      setError(t("errors.body"));
    } finally {
      stop();
      setStage(null);
      importing.current = false;
    }
  };

  if (fallback) {
    return (
      <div className="mt-6">
        <p className="text-4xl">🔍</p>
        <h1 className="mt-2 text-3xl font-semibold">{t("import.fallbackTitle")}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{t("import.fallbackText")}</p>
        <Link to="/app/import-text" className="btn btn-primary mt-8 w-full text-lg">
          {t("import.fallbackPrimary")}
        </Link>
        <Link to="/app/manual" className="btn btn-secondary mt-3 w-full">
          {t("import.fallbackSecondary")}
        </Link>
        <button
          className="mt-3 min-h-12 w-full font-medium text-muted-foreground underline"
          onClick={() => setFallback(false)}
        >
          {t("importFlow.anotherLink")}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <Link to="/app" className="inline-block min-h-12 py-3 font-semibold text-primary">
        ← {t("common.back")}
      </Link>
      <h1 className="text-3xl font-semibold">{t("import.urlTitle")}</h1>
      {stage !== null ? (
        <ImportProgress stages={stages} current={stage} />
      ) : (
        <div className="mt-6 space-y-4">
          <input
            className="field text-lg"
            inputMode="url"
            autoComplete="url"
            placeholder="https://…"
            aria-label={t("import.urlTitle")}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setPhotoRights(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && go()}
          />
          {error && (
            <p role="alert" className="rounded-xl bg-warning-soft p-3">
              {error}
            </p>
          )}
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={photoRights}
              onChange={(event) => setPhotoRights(event.target.checked)}
            />
            {t("importFlow.photoRights")}
          </label>
          <button className="btn btn-primary w-full text-lg" onClick={go} disabled={!url.trim()}>
            {t("import.action")}
          </button>
          <p className="text-center text-muted-foreground">{t("import.urlHelp")}</p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            <Link to="/app/import-text" className="inline-flex min-h-11 items-center underline">
              {t("app.paste")}
            </Link>
            <Link to="/app/manual" className="inline-flex min-h-11 items-center underline">
              {t("app.manual")}
            </Link>
            <Link to="/app/import-pms" className="inline-flex min-h-11 items-center underline">
              {locale === "fr" ? "Connecter un logiciel" : "Connect software"}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
