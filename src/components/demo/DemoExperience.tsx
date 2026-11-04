import { lazy, Suspense, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GuideView } from "@/components/guest/GuideView";
const DemoManager = lazy(() =>
  import("./DemoManager").then((module) => ({ default: module.DemoManager })),
);
import { createVillaMare, demoGuide } from "./villa-mare-fixture";
import { validStoredDemoProperty } from "./demo-storage";
import { useI18n } from "@/lib/i18n";
import { NonaConcierge } from "@/components/guest/NonaConcierge";
import { DemoServiceBooking } from "./DemoServiceBooking";
import { uxCopy } from "@/lib/ux-copy";

export function DemoExperience({
  compact = false,
  standalone = false,
  initialMode = "guest",
  onModeChange,
  action,
}: {
  compact?: boolean;
  standalone?: boolean;
  initialMode?: "guest" | "manager";
  onModeChange?: (mode: "guest" | "manager") => void;
  action?: ReactNode;
}) {
  const { locale, t } = useI18n();
  const ux = uxCopy(locale);
  const tabsId = useId();
  const toolbar = useRef<HTMLDivElement>(null);
  const previewRequested = useRef(false);
  const storageKey = `hostbuddy.demo.v2.${locale}`;
  const [villa, setVilla] = useState(() => createVillaMare(locale));
  const [restoredLocale, setRestoredLocale] = useState<string | null>(null);
  const [mode, setMode] = useState<"guest" | "manager">(initialMode);
  const [managerVisited, setManagerVisited] = useState(initialMode === "manager");
  useEffect(() => {
    if (mode !== "guest" || !previewRequested.current) return;
    previewRequested.current = false;
    const frame = requestAnimationFrame(() => {
      toolbar.current?.scrollIntoView({ block: "start" });
      document.getElementById(`${tabsId}-guest`)?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [mode, tabsId]);
  useEffect(() => {
    setMode(initialMode);
    if (initialMode === "manager") setManagerVisited(true);
  }, [initialMode]);
  const changeMode = (next: "guest" | "manager") => {
    if (next === "manager") setManagerVisited(true);
    setMode(next);
    setNotice(false);
    onModeChange?.(next);
  };
  const [section, setSection] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messageSent, setMessageSent] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  useEffect(() => {
    let property = createVillaMare(locale);
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      const stored: unknown = raw ? JSON.parse(raw) : null;
      if (validStoredDemoProperty(stored) && stored.id === "demo-villa-mare") property = stored;
    } catch {
      /* Invalid local demo state never affects real data. */
    }
    setVilla(property);
    setRestoredLocale(locale);
    setSection(null);
  }, [locale, storageKey]);
  useEffect(() => {
    if (restoredLocale !== locale) return;
    // Object URLs are ephemeral: do not restore dangling blobs after closing the page.
    if (villa.media.some((item) => item.storage_path.startsWith("blob:"))) return;
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(villa));
    } catch {
      /* Storage is optional for the isolated demo. */
    }
  }, [villa, locale, restoredLocale, storageKey]);
  return (
    <div
      className={`demo-container w-full ${!compact ? "nona-standalone-demo" : ""}`}
      data-layout={compact ? "embedded" : "page"}
      data-mode={mode}
    >
      <div className="nona-demo-toolbar" ref={toolbar}>
        <div
          className="nona-demo-tabs"
          role="tablist"
          aria-label={t("demo.pageTitle")}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next =
              event.key === "Home"
                ? "guest"
                : event.key === "End"
                  ? "manager"
                  : mode === "guest"
                    ? "manager"
                    : "guest";
            changeMode(next);
            document.getElementById(`${tabsId}-${next}`)?.focus();
          }}
        >
          {(["guest", "manager"] as const).map((next) => (
            <Button
              key={next}
              role="tab"
              id={`${tabsId}-${next}`}
              aria-controls={`${tabsId}-panel-${next}`}
              aria-selected={mode === next}
              tabIndex={mode === next ? 0 : -1}
              variant={mode === next ? "default" : "ghost"}
              className="nona-demo-tab min-h-12 whitespace-nowrap text-sm"
              onClick={() => changeMode(next)}
            >
              {next === "guest" ? ux.demoGuest : ux.demoManager}
            </Button>
          ))}
        </div>
        {!compact && !standalone && action}
      </div>
      {!compact && !standalone && (
        <div className="nona-demo-context">
          <p>{mode === "guest" ? ux.demoGuestHint : ux.demoManagerHint}</p>
          <small>{ux.demoSafe}</small>
        </div>
      )}
      <div
        className={`demo-frame relative mx-auto w-full overflow-clip rounded-xl border bg-background shadow-soft ${compact ? "" : "max-w-6xl"}`}
      >
        <div
          data-nona-scroll-area={compact || undefined}
          className={`demo-viewport bg-background text-foreground ${mode === "manager" ? "overflow-visible" : "overflow-x-hidden overflow-y-auto"}`}
        >
          <div
            hidden={mode !== "guest"}
            role="tabpanel"
            id={`${tabsId}-panel-guest`}
            aria-labelledby={`${tabsId}-guest`}
            tabIndex={0}
          >
            <GuideView
              guide={demoGuide(villa)}
              sectionKey={section}
              onSectionChange={(key) => {
                setSection(key);
                setNotice(false);
              }}
              onRequest={setBookingId}
              onMessage={() => {
                setMessageSent(false);
                setMessageOpen(true);
              }}
              onFeedback={() => setNotice(true)}
            />
          </div>
          <div
            hidden={mode !== "manager"}
            className="h-full"
            role="tabpanel"
            id={`${tabsId}-panel-manager`}
            aria-labelledby={`${tabsId}-manager`}
            tabIndex={0}
          >
            {managerVisited && (
              <Suspense
                fallback={
                  <div
                    className="nona-workspace-skeleton"
                    role="status"
                    aria-label={t("common.loading")}
                  >
                    <span />
                    <span />
                    <span />
                    <p>{t("common.loading")}</p>
                  </div>
                }
              >
                <DemoManager
                  standalone={!compact}
                  key={locale}
                  villa={villa}
                  onVillaChange={setVilla}
                  onPreview={() => {
                    setSection(null);
                    previewRequested.current = true;
                    changeMode("guest");
                  }}
                />
              </Suspense>
            )}
          </div>
          {notice && (
            <p className="hb-empty" role="status">
              {t("guide.demoRequest")}
            </p>
          )}
        </div>
      </div>
      <div hidden={mode !== "guest"} className="relative">
        <NonaConcierge guide={demoGuide(villa)} demo onContact={() => setMessageOpen(true)} />
      </div>
      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent>
          <DialogTitle>{t("guest.sendMessage")}</DialogTitle>
          <DialogDescription>{t("demo.messageHint")}</DialogDescription>
          {messageSent ? (
            <p role="status">{t("demo.messageSaved")}</p>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!message.trim()) return;
                setMessageSent(true);
                setMessage("");
              }}
            >
              <label className="block">
                {t("form.message")}
                <textarea
                  className="hb-input"
                  required
                  maxLength={2000}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </label>
              <Button type="submit" disabled={!message.trim()}>
                {t("common.send")}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <DemoServiceBooking
        guide={demoGuide(villa)}
        serviceId={bookingId}
        onClose={() => setBookingId(null)}
      />
    </div>
  );
}
