import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GuideView } from "@/components/guest/GuideView";
import { DemoManager } from "./DemoManager";
import { createVillaMare, demoGuide } from "./villa-mare-fixture";
import type { DemoProperty } from "./demo-property";
import { useI18n } from "@/lib/i18n";

function validStored(value: unknown): value is DemoProperty {
  if (!value || typeof value !== "object") return false;
  const property = value as Partial<DemoProperty>;
  return (
    property.id === "demo-villa-mare" &&
    typeof property.name === "string" &&
    Array.isArray(property.sections) &&
    property.sections.every(
      (section) => typeof section.section_key === "string" && !!section.content,
    ) &&
    Array.isArray(property.media) &&
    property.media.every(
      (item) => typeof item.storage_path === "string" && !item.storage_path.startsWith("blob:"),
    ) &&
    Array.isArray(property.services) &&
    Array.isArray(property.fields)
  );
}

export function DemoExperience({ compact = false }: { compact?: boolean }) {
  const { locale, t } = useI18n();
  const storageKey = `hostbuddy.demo.v2.${locale}`;
  const [villa, setVilla] = useState(() => createVillaMare(locale));
  const [restoredLocale, setRestoredLocale] = useState<string | null>(null);
  const [mode, setMode] = useState<"guest" | "manager">("guest");
  const [section, setSection] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);
  useEffect(() => {
    let property = createVillaMare(locale);
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      const stored: unknown = raw ? JSON.parse(raw) : null;
      if (validStored(stored)) property = stored;
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
        className={`demo-frame mx-auto w-full overflow-hidden rounded-xl border bg-background shadow-soft ${compact ? "" : "max-w-6xl"}`}
      >
        <div
          className={`demo-viewport overflow-x-hidden bg-background text-foreground ${mode === "manager" ? "overflow-y-hidden" : "overflow-y-auto"}`}
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
              onMessage={() => setNotice(true)}
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
    </div>
  );
}
