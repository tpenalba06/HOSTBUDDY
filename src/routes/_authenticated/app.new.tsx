import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ManagerNewPropertyScreen } from "@/components/app/ManagerScreens";

export const Route = createFileRoute("/_authenticated/app/new")({ component: NewProperty });

function NewProperty() {
  const nav = useNavigate();
  return (
    <ManagerNewPropertyScreen
      onBack={() => nav({ to: "/app" })}
      onImportUrl={() => nav({ to: "/app/import-url" })}
      onPasteText={() => nav({ to: "/app/import-text" })}
      onManual={() => nav({ to: "/app/manual" })}
    />
  );
}
