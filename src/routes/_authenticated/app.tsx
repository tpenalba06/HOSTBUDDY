import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { reconcileBilling } from "@/lib/integrations/billing.functions";
import { supabase } from "@/integrations/supabase/client";
import { orgQuery, useOrg } from "@/components/app/useOrg";
import { FriendlyError, Loading } from "@/components/app/Friendly";
import { ManagerShell } from "@/components/app/ManagerShell";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [{ title: "Mon espace — HostBuddy" }, { name: "robots", content: "noindex" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(orgQuery),
  pendingComponent: () => <Loading />,
  errorComponent: () => (
    <main className="mx-auto max-w-2xl px-5">
      <FriendlyError />
    </main>
  ),
  component: AppLayout,
});

function AppLayout() {
  const org = useOrg();
  const nav = useNavigate();
  const qc = useQueryClient();
  useQuery({
    queryKey: ["billing-sync", org.id],
    enabled: org.role !== "member",
    queryFn: () => reconcileBilling({ data: { organizationId: org.id } }),
    refetchInterval: 60_000,
    retry: 2,
  });
  const pendingOrders = useQuery({
    queryKey: ["pending-service-orders", org.id],
    queryFn: async () => {
      const result = await supabase
        .from("orders")
        .select("id", { head: true, count: "exact" })
        .eq("organization_id", org.id)
        .eq("status", "pending");
      if (result.error) throw new Error("unavailable");
      return result.count ?? 0;
    },
    refetchInterval: 30_000,
  });
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", search: { mode: "login" }, replace: true });
  };
  return (
    <ManagerShell
      pendingOrders={pendingOrders.data ?? 0}
      orgName={org.name}
      role={org.role}
      onSignOut={signOut}
    >
      <Outlet />
    </ManagerShell>
  );
}
