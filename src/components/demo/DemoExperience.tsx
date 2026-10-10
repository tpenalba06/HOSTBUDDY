import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GuideView } from "@/components/guest/GuideView";
import { DemoManager } from "./DemoManager";
import { createVillaMare, demoGuide } from "./villa-mare-fixture";
import { validStoredDemoProperty } from "./demo-storage";
import { useI18n } from "@/lib/i18n";

export function DemoExperience({ compact = false }: { compact?: boolean }) {
  const { locale, t } = useI18n();
  const storageKey = `hostbuddy.demo.v2.${locale}`;
  const [villa, setVilla] = useState(() => createVillaMare(locale));
  const [restoredLocale, setRestoredLocale] = useState<string | null>(null);
  const [mode, setMode] = useState<"guest" | "manager">("guest");
  const [section, setSection] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messageSent, setMessageSent] = useState(false);
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
    <div className="demo-container w-full">
      <div
        className="mx-auto mb-4 grid max-w-md grid-cols-2 rounded-full border bg-card/95 p-1.5 py-2.5 shadow-soft"
        role="tablist"
        aria-label={t("demo.pageTitle")}
      >
        {(["guest", "manager"] as const).map((next) => (
          <Button
            key={next}
            role="tab"
            aria-selected={mode === next}
            variant={mode === next ? "default" : "ghost"}
            className="min-h-12 whitespace-nowrap text-sm text-foreground hover:text-foreground"
            onClick={() => {
              setMode(next);
              setNotice(false);
            }}
          >
            {t(next === "guest" ? "demo.guest" : "demo.manager")}
          </Button>
        ))}
      </div>
      <div
        className={`demo-frame mx-auto w-full overflow-clip rounded-xl border bg-background shadow-soft ${compact ? "" : "max-w-6xl"}`}
      >
        <div
          className={`demo-viewport bg-background text-foreground ${mode === "manager" ? "overflow-visible" : "overflow-x-hidden overflow-y-auto"}`}
        >
          <div hidden={mode !== "guest"}>
            <GuideView
              guide={demoGuide(villa)}
              sectionKey={section}
              onSectionChange={(key) => {
                setSection(key);
                setNotice(false);
              }}
              onRequest={() => setNotice(true)}
              onMessage={() => {
                setMessageSent(false);
                setMessageOpen(true);
              }}
              onFeedback={() => setNotice(true)}
            />
          </div>
          <div hidden={mode !== "manager"} className="h-full">
            <DemoManager
              key={locale}
              villa={villa}
              onVillaChange={setVilla}
              onPreview={() => {
                setSection(null);
                setMode("guest");
              }}
            />
          </div>
          {notice && (
            <p className="hb-empty" role="status">
              {t("guide.demoRequest")}
            </p>
          )}
        </div>
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
    </div>
  );
}
