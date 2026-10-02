import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  return <ManagerConnectionsScreen onBack={() => nav({ to: "/app" })} />;
}
