import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, Check, CircleX, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loading, FriendlyError } from "@/components/app/Friendly";
import { useOrg, orgQuery } from "@/components/app/useOrg";
import { useI18n } from "@/lib/i18n";
import { listOrders, updateOrderStatus } from "@/lib/data/operations";

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
  const { t, locale } = useI18n();
  const org = useOrg();
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const groups = [
    {
      title: t("orders.today"),
      items: data.filter(
        (x) =>
          x.status !== "completed" &&
          x.status !== "cancelled" &&
          new Date(x.requested_for ?? x.created_at).toDateString() === new Date().toDateString(),
      ),
    },
    {
      title: t("orders.upcoming"),
      items: data.filter(
        (x) =>
          x.status !== "completed" &&
          x.status !== "cancelled" &&
          new Date(x.requested_for ?? x.created_at) > today &&
          new Date(x.requested_for ?? x.created_at).toDateString() !== new Date().toDateString(),
      ),
    },
    {
      title: t("orders.completed"),
      items: data.filter((x) => x.status === "completed" || x.status === "cancelled"),
    },
  ];
  return (
    <div className="py-6">
      <Link
        to="/app"
        className="inline-flex min-h-12 items-center gap-2 font-semibold text-primary"
      >
        <ArrowLeft />
        {t("ops.back")}
      </Link>
      <div className="mt-2">
        <p className="font-bold text-primary">{t("ops.operations")}</p>
        <h1 className="text-4xl font-semibold">{t("orders.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("orders.desc")}</p>
      </div>
      {groups.map((group) => (
        <section key={group.title} className="mt-8">
          <h2 className="text-2xl font-semibold">
            {group.title}{" "}
            <span className="text-base font-sans text-muted-foreground">
              ({group.items.length})
            </span>
          </h2>
          {group.items.length ? (
            <div className="mt-3 grid gap-3 xl:grid-cols-2">
              {group.items.map((order) => (
                <article key={order.id} className="surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{order.services?.name ?? t("orders.service")}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.properties?.name} · {order.guest_name || t("orders.guest")}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${order.status === "pending" ? "bg-warning-soft" : order.status === "confirmed" ? "bg-success-soft text-success" : "bg-muted"}`}
                    >
                      {order.status === "pending"
                        ? t("orders.pending")
                        : order.status === "confirmed"
                          ? t("orders.confirmed")
                          : order.status === "completed"
                            ? t("orders.completed")
                            : t("orders.cancelled")}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm">
                      <CalendarClock className="h-4 w-4" />
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(order.requested_for ?? order.created_at))}
                    </span>
                    <strong>{Number(order.total_amount).toFixed(2)} €</strong>
                  </div>
                  {order.status !== "completed" && order.status !== "cancelled" && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {order.status === "pending" ? (
                        <Button
                          onClick={() => mutation.mutate({ id: order.id, status: "confirmed" })}
                        >
                          <Check />
                          {t("orders.confirm")}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => mutation.mutate({ id: order.id, status: "completed" })}
                        >
                          <PackageCheck />
                          {t("orders.finish")}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => mutation.mutate({ id: order.id, status: "cancelled" })}
                      >
                        <CircleX />
                        {t("orders.cancel")}
                      </Button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-xl bg-muted p-4 text-muted-foreground">
              {t("orders.empty")}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
