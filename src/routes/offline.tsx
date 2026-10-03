import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { GuideView } from "@/components/guest/GuideView";
import type { GuideViewData } from "@/components/guest/guide-model";
import {
  deleteSnapshot,
  listSnapshots,
  readSnapshot,
  restoreGuide,
  verifySnapshot,
  type OfflineSnapshot,
} from "@/lib/offline/store";
export const Route = createFileRoute("/offline")({
  validateSearch: (search: Record<string, unknown>): { slug?: string } =>
    typeof search["slug"] === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(search["slug"])
      ? { slug: search["slug"] }
      : {},
  head: () => ({
    meta: [{ title: "Guides enregistrés — HostBuddy" }, { name: "robots", content: "noindex" }],
  }),
  component: OfflinePage,
});
function OfflinePage() {
  const { t, locale } = useI18n();
  const { slug } = Route.useSearch();
  const [guide, setGuide] = useState<GuideViewData | null>(null);
  const [copies, setCopies] = useState<OfflineSnapshot[]>([]);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let live = true;
    let release: (() => void) | undefined;
    setGuide(null);
    setError("");
    (async () => {
      if (!slug) {
        const items = await listSnapshots();
        if (live) setCopies(items);
        return;
      }
      const snapshot = await readSnapshot(slug);
      if (!snapshot) throw new Error(t("offline.noCopy"));
      await verifySnapshot(snapshot);
      const restored = restoreGuide(snapshot);
      release = restored.dispose;
      if (live) {
        setGuide(restored.guide);
        setSavedAt(snapshot.savedAt);
      } else release();
    })().catch((e) => {
      if (live) setError(e instanceof Error ? e.message : t("offline.unavailable"));
    });
    return () => {
      live = false;
      release?.();
    };
  }, [slug, t]);
  const unavailable = () => setNotice(t("offline.requiresNetwork"));
  const remove = async (key: string) => {
    await deleteSnapshot(key);
    const remaining = await listSnapshots();
    setCopies(remaining);
    const retained = new Set(remaining.map((item) => item.shellCache));
    for (const name of await caches.keys())
      if (name.startsWith("hb-guest-shell-") && !retained.has(name)) await caches.delete(name);
  };
  return (
    <div className="hb-guide">
      <div className="hb-offline-banner">
        <span>{slug ? t("offline.copy") : t("offline.savedGuides")}</span>
        {savedAt && <small>{new Date(savedAt).toLocaleDateString(locale)}</small>}
        <a href="/offline">{t("offline.myCopies")}</a>
        {slug && <a href={`/l/${encodeURIComponent(slug)}`}>{t("offline.online")}</a>}
      </div>
      {notice && (
        <p role="status" className="hb-offline-notice">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="hb-offline-notice">
          {error}
        </p>
      )}
      {guide && (
        <GuideView
          guide={guide}
          onRequest={unavailable}
          onMessage={unavailable}
          onFeedback={unavailable}
        />
      )}
      {!slug && (
        <main className="hb-offline-list">
          <h1>{t("offline.savedGuides")}</h1>
          <p>{t("offline.available")}</p>
          {copies.map((item) => (
            <article key={item.slug}>
              <a href={`/offline?slug=${encodeURIComponent(item.slug)}`}>{item.guide.name}</a>
              <small>
                {(item.bytes / 1024 / 1024).toFixed(1)} Mo ·{" "}
                {new Date(item.savedAt).toLocaleDateString(locale)}
              </small>
              <button onClick={() => void remove(item.slug).catch((e) => setError(e.message))}>
                {t("offline.delete")}
              </button>
            </article>
          ))}
          {!copies.length && (
            <p>
              Aucun guide enregistré. Ouvrez un guide en ligne et choisissez « Enregistrer hors
              connexion ».
            </p>
          )}
        </main>
      )}
    </div>
  );
}
