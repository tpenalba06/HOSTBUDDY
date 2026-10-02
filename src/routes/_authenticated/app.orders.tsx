import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Loading, FriendlyError } from "@/components/app/Friendly";
import { useOrg, orgQuery } from "@/components/app/useOrg";
import { listOrders, updateOrderStatus } from "@/lib/data/operations";
import { ManagerOrdersScreen } from "@/components/app/ManagerScreens";

const ordersQuery = (orgId: string) =>
  queryOptions({
    queryKey: ["orders", orgId],
    queryFn: () => listOrders(orgId),
    staleTime: 15_000,
  });

export const Route = createFileRoute("/_authenticated/app/orders")({
  head: () => ({
    meta: [
      { title: "Commandes — HostBuddy" },
      { name: "description", content: "Demandes de services voyageurs." },
      { property: "og:title", content: "Commandes — HostBuddy" },
      { property: "og:description", content: "Demandes de services voyageurs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ context }) => {
    const org = await context.queryClient.ensureQueryData(orgQuery);
    await context.queryClient.ensureQueryData(ordersQuery(org.id));
  },
  pendingComponent: Loading,
  errorComponent: FriendlyError,
  component: OrdersPage,
});

function OrdersPage() {
  const org = useOrg();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(ordersQuery(org.id));
  const mutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "pending" | "confirmed" | "completed" | "cancelled";
    }) => updateOrderStatus(id, status),
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: ["orders", org.id] });
      qc.setQueryData(ordersQuery(org.id).queryKey, (old) =>
        old?.map((item) => (item.id === next.id ? { ...item, status: next.status } : item)),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["orders", org.id] }),
  });

  return (
    <ManagerOrdersScreen
      orders={data}
      onBack={() => nav({ to: "/app" })}
      onStatusChange={(id, status) => mutation.mutate({ id, status })}
    />
  );
}
