import { createFileRoute, Link } from "@tanstack/react-router";
import { StartOptions } from "./app.index";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/app/new")({ component: NewProperty });

function NewProperty() {
  const { t } = useI18n();
  return (
    <div className="mt-6">
      <Link to="/app" className="inline-block min-h-12 py-3 font-semibold text-primary">
        ← {t("app.myProperties")}
      </Link>
      <h1 className="text-3xl font-semibold">{t("app.addTitle")}</h1>
      <StartOptions />
    </div>
  );
}
