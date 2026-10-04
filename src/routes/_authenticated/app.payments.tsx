import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useOrg } from "@/components/app/useOrg";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { managePayments } from "@/lib/integrations/payments.functions";
export const Route = createFileRoute("/_authenticated/app/payments")({ component: PaymentsPage });
function PaymentsPage() {
  const org = useOrg();
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [link, setLink] = useState("");
  const query = useQuery({
    queryKey: ["payments", org.id],
    enabled: org.role === "owner",
    queryFn: () => managePayments({ data: { organizationId: org.id, action: "overview" } }),
  });
  const state = query.data && "overview" in query.data ? query.data.overview : null;
  const act = async (
    action: "billing" | "portal" | "connect" | "payment_link" | "refund",
    id?: string,
  ) => {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const result = await managePayments({
        data: { organizationId: org.id, action, ...(id ? { id } : {}) },
      });
      if ("url" in result) {
        if (action === "payment_link") setLink(result.url);
        else window.location.assign(result.url);
      }
      await qc.invalidateQueries({ queryKey: ["payments", org.id] });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  if (org.role !== "owner") return <p role="alert">{t("app.readOnly")}</p>;
  const format = (n: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(n / 100);
  return (
    <div className="py-6">
      <h1 className="text-4xl">{t("nav.payments")}</h1>
      {(error || query.isError) && (
        <p role="alert" className="mt-4 rounded-xl bg-warning-soft p-4">
          {t("payments.error")}
        </p>
      )}
      {query.isLoading && (
        <p role="status" className="mt-4">
          {t("common.loading")}
        </p>
      )}
      {state?.config.mode === "test" && (
        <p className="mt-4 text-sm text-muted-foreground">{t("payments.test")}</p>
      )}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="surface p-6">
          <h2 className="text-2xl">{t("payments.subscription")}</h2>
          <p className="mt-4 font-display text-3xl">{t("marketing.price")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("marketing.priceNote")}</p>
          {!state?.config.billing ? (
            <p className="mt-5 text-muted-foreground">{t("payments.notConfigured")}</p>
          ) : (
            <>
              <p className="mt-5">
                {t(
                  state.account?.subscription_status === "active"
                    ? "payments.active"
                    : state.account?.subscription_status === "trialing"
                      ? "payments.trial"
                      : "payments.inactive",
                )}
              </p>
              {state.account?.current_period_end && (
                <p className="mt-2 text-sm">
                  {new Date(state.account.current_period_end).toLocaleDateString(locale)}
                </p>
              )}
              <Button
                className="mt-5 min-h-12"
                disabled={busy}
                onClick={() => act(state.account?.stripe_subscription_id ? "portal" : "billing")}
              >
                {t(state.account?.stripe_subscription_id ? "payments.manage" : "payments.setup")}
              </Button>
            </>
          )}
        </section>
        <section className="surface p-6">
          <h2 className="text-2xl">{t("payments.services")}</h2>
          <p className="mt-4 text-muted-foreground">
            {t(
              state?.account?.charges_enabled ? "payments.confirmation" : "payments.notConfigured",
            )}
          </p>
          {state?.config.connect && (
            <Button className="mt-5 min-h-12" disabled={busy} onClick={() => act("connect")}>
              {t("payments.connect")}
            </Button>
          )}
          <Button
            variant="outline"
            className="ml-2 mt-5 min-h-12"
            disabled={busy}
            onClick={() => query.refetch()}
          >
            {t("payments.refresh")}
          </Button>
        </section>
      </div>
      {!!state?.confirmedOrders?.length && state.account?.charges_enabled && (
        <section className="mt-6 surface p-6">
          <h2 className="text-2xl">{t("payments.paymentLink")}</h2>
          {state.confirmedOrders?.map((order) => (
            <div key={order.id} className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span>
                {order.services?.name} · {format(Number(order.total_amount) * 100)}
              </span>
              <Button disabled={busy} onClick={() => act("payment_link", order.id)}>
                {t("payments.paymentLink")}
              </Button>
            </div>
          ))}
        </section>
      )}
      {link && (
        <div className="mt-4 rounded-xl border bg-card p-4">
          <p className="break-all text-sm">{link}</p>
          <Button
            className="mt-3"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
              } catch {
                setError(true);
              }
            }}
          >
            {t("payments.copy")}
          </Button>
        </div>
      )}
      {!!state?.payments?.length && (
        <section className="mt-6 surface p-6">
          <h2 className="text-2xl">{t("payments.receipts")}</h2>
          {state.payments?.map((payment) => (
            <div
              key={payment.id}
              className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4"
            >
              <p>
                {format(payment.amount_cents)} ·{" "}
                {t(
                  payment.status === "paid"
                    ? "payments.paid"
                    : payment.status === "refunded"
                      ? "payments.refunded"
                      : payment.status === "partially_refunded"
                        ? "payments.partialRefund"
                        : ["failed", "expired"].includes(payment.status)
                          ? "payments.failed"
                          : "payments.pending",
                )}
              </p>
              {payment.status === "paid" && (
                <Button variant="outline" disabled={busy} onClick={() => act("refund", payment.id)}>
                  {t("payments.refund")}
                </Button>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
