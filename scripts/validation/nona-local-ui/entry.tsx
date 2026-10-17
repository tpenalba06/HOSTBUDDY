import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { LocaleProvider, useI18n } from "@/lib/i18n";
import { GuideView } from "@/components/guest/GuideView";
import { LocalConciergeTransport } from "@/lib/concierge-transport";
import type { ConciergeRequest, ConciergeTurn } from "@/lib/concierge";
import type { GuideViewData } from "@/components/guest/guide-model";
import "@/styles.css";
import "@/styles/nona-art-direction.css";
import { nonaVisualCopy } from "@/lib/nona-visual-copy";
import { DemoServiceBooking } from "@/components/demo/DemoServiceBooking";

async function sendLocalTurn(request: ConciergeRequest): Promise<ConciergeTurn> {
  const response = await fetch("/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...request, mode: "local" }),
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(130000),
  });
  if (!response.ok) throw new Error("local-model-unavailable");
  return response.json();
}

// The shared form may refresh a quote while its prefill effects settle. Queue
// these requests so the local model's single-flight lock cannot drop a quote.
let turnQueue: Promise<void> = Promise.resolve();
function localTransport(request: ConciergeRequest): Promise<ConciergeTurn> {
  const pending = turnQueue.then(() => sendLocalTurn(request));
  turnQueue = pending.then(
    () => undefined,
    () => undefined,
  );
  return pending;
}

// eslint-disable-next-line react-refresh/only-export-components -- Standalone local browser entry.
function LocalGuide() {
  const { locale } = useI18n();
  const [loaded, setLoaded] = useState<{ locale: string; guide: GuideViewData } | null>(null);
  const [failed, setFailed] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    void fetch(`/local-guide?locale=${locale}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("local-guide-unavailable");
        const guide: GuideViewData = await response.json();
        if (!controller.signal.aborted) setLoaded({ locale, guide });
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [locale]);
  if (failed) return <p role="alert">Le livret local est indisponible. Relance Ouvrir-NONA.cmd.</p>;
  if (!loaded) return <p role="status">Ouverture du livret NONA…</p>;
  const guide = loaded.guide;
  return (
    <LocalConciergeTransport.Provider value={localTransport}>
      <aside role="status" className="nona-local-preview-notice">
        {nonaVisualCopy(locale).local}
      </aside>
      <GuideView
        guide={guide}
        displayName={guide.name.replace(/\s+[\u2013\u2014-] recette locale.*$/, "")}
        conciergeSlug="nona-local"
        onRequest={setBookingId}
      />
      <DemoServiceBooking guide={guide} serviceId={bookingId} onClose={() => setBookingId(null)} />
    </LocalConciergeTransport.Provider>
  );
}

createRoot(document.getElementById("root")!).render(
  <LocaleProvider>
    <LocalGuide />
  </LocaleProvider>,
);
