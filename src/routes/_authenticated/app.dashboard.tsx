import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  CircleDollarSign,
  ClipboardList,
  MessageCircle,
  Star,
} from "lucide-react";
import { orgQuery, useOrg } from "@/components/app/useOrg";
import { dashboardMetrics } from "@/lib/data/operations";
import { Loading } from "@/components/app/Friendly";
import { useI18n } from "@/lib/i18n";
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
  const { t, locale } = useI18n();
  const org = useOrg();
  const { data } = useSuspenseQuery(metricsQuery(org.id));
  const cards = [
    {
      label: t("dashboard.properties"),
      value: data.properties,
      detail: `${data.published} ${t("dashboard.liveGuides")}`,
      icon: Building2,
    },
    {
      label: t("dashboard.unread"),
      value: data.unread,
      detail: t("dashboard.toHandle"),
      icon: MessageCircle,
    },
    {
      label: t("dashboard.activeOrders"),
      value: data.todayOrders,
      detail: t("dashboard.upcoming"),
      icon: ClipboardList,
    },
    {
      label: t("dashboard.requestTotal"),
      value: `${data.requestTotal.toFixed(2)} €`,
      detail: t("dashboard.notCollected"),
      icon: CircleDollarSign,
    },
  ];
  return (
    <div className="py-6">
      <p className="font-bold text-primary">{t("dashboard.owner")}</p>
      <h1 className="text-4xl font-semibold">{t("dashboard.title")}</h1>
      <p className="mt-2 text-muted-foreground">
        {t("dashboard.desc")} {org.name}.
      </p>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="surface p-5">
            <card.icon className="h-6 w-6 text-primary" />
            <p className="mt-4 text-sm font-bold text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-3xl font-semibold">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>
          </article>
        ))}
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link to="/app/new" className="btn btn-primary">
          {t("app.add")}
          <ArrowRight />
        </Link>
        <Link to="/app/orders" className="btn btn-secondary">
          {t("dashboard.viewOrders")}
          <ArrowRight />
        </Link>
      </div>
      <section className="mt-9">
        <h2 className="text-2xl font-semibold">{t("dashboard.recent")}</h2>
        {data.recentFeedback.length ? (
          <div className="mt-3 space-y-2">
            {data.recentFeedback.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border bg-card p-4"
              >
                <span className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  {item.rating}/5
                </span>
                <span className="text-sm text-muted-foreground">
                  {new Intl.DateTimeFormat(locale).format(new Date(item.created_at))}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-muted-foreground">{t("dashboard.none")}</p>
        )}
      </section>
    </div>
  );
}
