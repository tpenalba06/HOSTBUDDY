import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/shared/Logo";
export const Route = createFileRoute("/pay/$token")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex,nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: PaymentPage,
});
function PaymentPage() {
  const { token } = Route.useParams();
  const { t, locale } = useI18n();
  const summary = useQuery({
    queryKey: ["payment-info", token],
    retry: false,
    queryFn: async () => {
      const response = await fetch("/api/public/payment-info", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) throw new Error("unavailable");
      return (await response.json()) as {
        amountCents: number;
        currency: string;
        status: string;
        name: string;
        canPay: boolean;
      };
    },
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return (
    <main className="mx-auto max-w-lg px-5 py-10">
      <Logo />
      <section className="surface mt-8 p-6">
        <h1 className="text-3xl">{t("payments.services")}</h1>
        <p className="mt-4">{t("payments.confirmation")}</p>
        {summary.data && (
          <>
            <h2 className="mt-5 text-2xl">{summary.data.name}</h2>
            <p className="mt-2 text-xl">
              {new Intl.NumberFormat(locale, {
                style: "currency",
                currency: summary.data.currency,
              }).format(summary.data.amountCents / 100)}
            </p>
            {summary.data.status === "paid" && (
              <p role="status" className="mt-4">
                {t("payments.success")}
              </p>
            )}
          </>
        )}
        {summary.isLoading && <p className="mt-4">{t("common.loading")}</p>}
        {(error || summary.isError) && (
          <p role="alert" className="mt-4">
            {t("payments.unavailable")}
          </p>
        )}
        <button
          className="btn btn-primary mt-6 w-full"
          disabled={busy || !summary.data?.canPay}
          onClick={async () => {
            if (busy) return;
            setBusy(true);
            try {
              const response = await fetch("/api/public/checkout", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ token }),
              });
              const result = await response.json();
              if (!response.ok || !result.url) throw new Error();
              window.location.assign(result.url);
            } catch {
              setError(true);
              setBusy(false);
            }
          }}
        >
          {t(busy ? "common.loading" : "payments.pay")}
        </button>
      </section>
    </main>
  );
}
