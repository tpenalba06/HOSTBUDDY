import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useOrg } from "@/components/app/useOrg";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { managePayments } from "@/lib/integrations/payments.functions";
export const Route = createFileRoute("/_authenticated/app/payments")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { connect?: "return" | "refresh" | undefined; connectOrg?: string | undefined } => ({
    connect:
      search["connect"] === "return" || search["connect"] === "refresh"
        ? search["connect"]
        : undefined,
    connectOrg: typeof search["connectOrg"] === "string" ? search["connectOrg"] : undefined,
  }),
  component: PaymentsPage,
});
function PaymentsPage() {
  const org = useOrg();
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [feeAccepted, setFeeAccepted] = useState(false);
  const [country, setCountry] = useState("");
  const [link, setLink] = useState("");
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const refreshHandled = useRef(false);
  const connectQuery = useQuery({
    queryKey: ["stripe-connect", org.id],
    enabled: org.role === "owner",
    queryFn: () => managePayments({ data: { organizationId: org.id, action: "connect_status" } }),
  });
  const connect =
    connectQuery.data && "connect" in connectQuery.data ? connectQuery.data.connect : null;
  const canResume =
    !!connect?.account?.stripe_account_id &&
    connect.account.service_fee_terms_version === "services-2pct-v1" &&
    !!connect.account.service_fee_terms_accepted_at;
  // Clear refresh before redirecting. Allow one automatic renewal until the
  // owner explicitly starts/resumes again, preventing repeated bad-link bounces.
  useEffect(() => {
    if (!search.connect || org.role !== "owner") return;
    if (search.connectOrg !== org.id) {
      setError(true);
      return;
    }
    if (search.connect !== "refresh" || refreshHandled.current) return;
    refreshHandled.current = true;
    void navigate({ search: {}, replace: true });
    const key = `hostbuddy.connect.refresh.${org.id}`;
    try {
      if (window.sessionStorage.getItem(key)) {
        setError(true);
        return;
      }
      window.sessionStorage.setItem(key, "1");
    } catch {
      /* A disabled session store does not prevent one renewal. */
    }
    setBusy(true);
    void managePayments({ data: { organizationId: org.id, action: "connect_resume" } })
      .then((result) => {
        if ("url" in result) window.location.assign(result.url);
      })
      .catch(() => setError(true))
      .finally(() => setBusy(false));
  }, [search.connect, search.connectOrg, org.id, org.role, navigate]);
  const query = useQuery({
    queryKey: ["payments", org.id],
    enabled: org.role === "owner",
    queryFn: () => managePayments({ data: { organizationId: org.id, action: "overview" } }),
  });
  const state = query.data && "overview" in query.data ? query.data.overview : null;
  const act = async (
    action: "billing" | "portal" | "connect" | "connect_resume" | "payment_link" | "refund",
    id?: string,
  ) => {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      if (action === "connect" || action === "connect_resume") {
        try {
          window.sessionStorage.removeItem(`hostbuddy.connect.refresh.${org.id}`);
        } catch {
          /* optional */
        }
      }
      const result = await managePayments({
        data: {
          organizationId: org.id,
          action,
          ...(action === "connect" ? { feeTermsAccepted: feeAccepted, country } : {}),
          ...(id ? { id } : {}),
        },
      });
      if ("url" in result) {
        if (action === "payment_link") setLink(result.url);
        else window.location.assign(result.url);
      }
      if (action === "connect" || action === "connect_resume")
        await qc.invalidateQueries({ queryKey: ["stripe-connect", org.id] });
      else await qc.invalidateQueries({ queryKey: ["payments", org.id] });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  if (org.role !== "owner") return <p role="alert">{t("app.readOnly")}</p>;
  const format = (n: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(n / 100);
  const billingAction =
    state?.quote.monthlyCents === 0 ||
    (state?.account?.stripe_subscription_id &&
      !["canceled", "incomplete_expired"].includes(state.account.subscription_status))
      ? "portal"
      : "billing";
  return (
    <div className="py-6">
      <h1 className="text-4xl">{t("nav.payments")}</h1>
      {(error || query.isError || connectQuery.isError) && (
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
          <p className="mt-4 font-display text-3xl">
            {state?.quote.monthlyCents === 0 ? t("payments.free") : t("marketing.price")}
          </p>
          <p className="mt-2 text-sm">{t("payments.freeNote")}</p>
          {state && (
            <p className="mt-3 font-semibold">
              {t("payments.counter")
                .replace("{count}", String(state.quote.propertyCount))
                .replace("{amount}", format(state.quote.monthlyCents))}
            </p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">{t("payments.syncNote")}</p>
          {state?.syncPending && (
            <p role="alert" className="mt-3 text-warning">
              {t("payments.syncPending")}
            </p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">{t("marketing.priceNote")}</p>
          {state?.quote.monthlyCents === 0 && !state.account?.stripe_subscription_id ? null : !state
              ?.config.billing ? (
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
              <Button className="mt-5 min-h-12" disabled={busy} onClick={() => act(billingAction)}>
                {t(billingAction === "portal" ? "payments.manage" : "payments.setup")}
              </Button>
            </>
          )}
        </section>
        <section className="surface p-6">
          <h2 className="text-2xl">{t("payments.services")}</h2>
          <p className="mt-4 text-muted-foreground">
            {connectQuery.isPending
              ? t("common.loading")
              : connectQuery.isError
                ? t("payments.error")
                : t(
                    connect?.onboarding
                      ? `payments.connect.${connect.onboarding.status}`
                      : connect?.config.connect
                        ? "payments.connect.notConnected"
                        : "payments.notConfigured",
                  )}
          </p>
          {search.connect === "return" && search.connectOrg === org.id && (
            <p role="status" className="mt-3 text-sm">
              {t("payments.connect.returned")}
            </p>
          )}
          {!!connect?.onboarding?.requirements.length && (
            <div className="mt-4 text-sm">
              <p>{t("payments.connect.remaining")}</p>
              <ul className="mt-2 list-disc pl-5">
                {connect.onboarding.requirements.map((item) => (
                  <li key={item}>{t(`payments.connect.required.${item}`)}</li>
                ))}
              </ul>
            </div>
          )}
          {connect?.onboarding?.pendingVerification &&
            connect.onboarding.status !== "verification" && (
              <p className="mt-3 text-sm">{t("payments.connect.verification")}</p>
            )}
          {connect?.onboarding?.chargesEnabled && !connect.onboarding.payoutsEnabled && (
            <p className="mt-3 text-sm">{t("payments.connect.payoutsPending")}</p>
          )}
          <p className="mt-4 text-sm">{t("payments.feeTerms")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("payments.feeRefundNote")}</p>
          {connect?.config.connect && !canResume && (
            <label className="mt-4 block text-sm">
              {t("payments.businessCountry")}
              <input
                className="mt-2 block min-h-12 w-full rounded-xl border bg-background px-3"
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
                minLength={2}
                maxLength={2}
                autoComplete="country"
                placeholder="FR"
                aria-describedby="payment-country-hint"
              />
              <span id="payment-country-hint" className="mt-1 block text-muted-foreground">
                {t("payments.countryHint")}
              </span>
            </label>
          )}
          {connect?.config.connect && !canResume && (
            <label className="mt-4 flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0"
                checked={feeAccepted}
                onChange={(e) => setFeeAccepted(e.target.checked)}
              />
              {t("payments.feeAccept")}
            </label>
          )}
          {connect?.config.connect && (
            <Button
              className="mt-5 min-h-12"
              disabled={busy || (!canResume && (!feeAccepted || !/^[A-Z]{2}$/.test(country)))}
              onClick={() => act(canResume ? "connect_resume" : "connect")}
            >
              {t(canResume ? "payments.connect.resume" : "payments.connect.start")}
            </Button>
          )}
          <Button
            variant="outline"
            className="ml-2 mt-5 min-h-12"
            disabled={busy}
            onClick={() => connectQuery.refetch()}
          >
            {t("payments.refresh")}
          </Button>
        </section>
      </div>
      {!!state?.confirmedOrders?.length &&
        !connectQuery.isError &&
        !connectQuery.isFetching &&
        connect?.onboarding?.chargesEnabled &&
        connect.account?.service_fee_terms_version === "services-2pct-v1" && (
          <section className="mt-6 surface p-6">
            <h2 className="text-2xl">{t("payments.paymentLink")}</h2>
            {state.confirmedOrders?.map((order) => (
              <div
                key={order.id}
                className="mt-4 flex flex-wrap items-center justify-between gap-3"
              >
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
              <p className="text-sm text-muted-foreground">
                {t("payments.feeAmount").replace(
                  "{amount}",
                  format(payment.application_fee_cents ?? 0),
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
