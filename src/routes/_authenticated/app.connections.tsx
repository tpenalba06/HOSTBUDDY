import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useOrg } from "@/components/app/useOrg";
import { manageGuesty } from "@/lib/integrations/providers/guesty.functions";
import { useI18n } from "@/lib/i18n";
import { ManagerConnectionsScreen } from "@/components/app/ManagerScreens";

export const Route = createFileRoute("/_authenticated/app/connections")({
  head: () => ({
    meta: [
      { title: "Connexions — HostBuddy" },
      { name: "description", content: "Les outils reliés à votre espace HostBuddy." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const nav = useNavigate();
  const { t } = useI18n();
  const org = useOrg();
  const query = useQuery({
    queryKey: ["guesty", org.id],
    enabled: org.role !== "member",
    queryFn: () => manageGuesty({ data: { organizationId: org.id, action: "status" } }),
  });
  const connected = query.data && "status" in query.data ? query.data.status.connected : false;
  return (
    <ManagerConnectionsScreen
      onBack={() => nav({ to: "/app" })}
      guestyConnected={connected}
      guestyAction={
        <Link to="/app/import-guesty" className="btn btn-secondary mt-4">
          {t("provider.title")}
        </Link>
      }
    />
  );
}
