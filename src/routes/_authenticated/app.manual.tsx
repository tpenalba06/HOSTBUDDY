import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createPropertyFromExtraction } from "@/lib/data/properties";
import { useOrg } from "@/components/app/useOrg";
import { friendlyMessage } from "@/components/app/Friendly";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/app/manual")({ component: Manual });

function Manual() {
  const { t } = useI18n();
  const org = useOrg();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const go = async () => {
    setBusy(true);
    setError("");
    try {
      const p = await createPropertyFromExtraction(
        org.id,
        "manual",
        { propertyName: name, fields: [] },
        null,
      );
      qc.invalidateQueries({ queryKey: ["properties"] });
      nav({ to: "/app/p/$id", params: { id: p.id }, search: { step: "complete" } });
    } catch (e) {
      setError(friendlyMessage(e));
      setBusy(false);
    }
  };
  return (
    <div className="mt-6">
      <Link to="/app" className="inline-block min-h-12 py-3 font-semibold text-primary">
        ← {t("common.back")}
      </Link>
      <h1 className="text-3xl font-semibold">{t("import.manualTitle")}</h1>
      <input
        className="field mt-6 text-lg"
        placeholder="Ex. : Villa des Oliviers"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-warning-soft p-3">
          {error}
        </p>
      )}
      <button
        className="btn btn-primary mt-4 w-full text-lg"
        disabled={!name.trim() || busy}
        onClick={go}
      >
        {t("common.continue")}
      </button>
    </div>
  );
}
