import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { orgQuery, useOrg } from "@/components/app/useOrg";
import { dashboardMetrics } from "@/lib/data/operations";
import { Loading } from "@/components/app/Friendly";
import { ManagerDashboardScreen } from "@/components/app/ManagerScreens";

const metricsQuery = (id: string) =>
  queryOptions({
    queryKey: ["dashboard", id],
    queryFn: () => dashboardMetrics(id),
    staleTime: 30_000,
  });

export const Route = createFileRoute("/_authenticated/app/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — HostBuddy" },
      { name: "description", content: "Résumé opérationnel de votre activité." },
      { property: "og:title", content: "Tableau de bord — HostBuddy" },
      { property: "og:description", content: "Résumé opérationnel de votre activité." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ context }) => {
    const org = await context.queryClient.ensureQueryData(orgQuery);
    if (org.role !== "owner") throw redirect({ to: "/app" });
    await context.queryClient.ensureQueryData(metricsQuery(org.id));
  },
  pendingComponent: Loading,
  component: Dashboard,
});

function Dashboard() {
  const org = useOrg();
  const nav = useNavigate();
  const { data } = useSuspenseQuery(metricsQuery(org.id));

  return (
    <ManagerDashboardScreen
      orgName={org.name}
      data={data}
      onAdd={() => nav({ to: "/app/new" })}
      onOrders={() => nav({ to: "/app/orders" })}
    />
  );
}
