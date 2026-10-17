import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { ManagerNewPropertyScreen } from "@/components/app/ManagerScreens";

export const Route = createFileRoute("/_authenticated/app/new")({ component: NewProperty });

function NewProperty() {
  const nav = useNavigate();
  const { t } = useI18n();
  return (
    <>
      <ManagerNewPropertyScreen
        onBack={() => nav({ to: "/app" })}
        onImportUrl={() => nav({ to: "/app/import-url" })}
        onPasteText={() => nav({ to: "/app/import-text" })}
        onManual={() => nav({ to: "/app/manual" })}
      />
      <Link to="/app/import-guesty" className="btn btn-secondary mt-6 w-full">
        {t("provider.title")}
      </Link>
    </>
  );
}
