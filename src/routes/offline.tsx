import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
      if (!snapshot) throw new Error("Ce guide n’a pas été enregistré sur cet appareil.");
      await verifySnapshot(snapshot);
      const restored = restoreGuide(snapshot);
      release = restored.dispose;
      if (live) {
        setGuide(restored.guide);
        setSavedAt(snapshot.savedAt);
      } else release();
    })().catch((e) => {
      if (live) setError(e instanceof Error ? e.message : "Le guide enregistré est indisponible.");
    });
    return () => {
      live = false;
      release?.();
    };
  }, [slug]);
  const unavailable = () =>
    setNotice(
      "Une connexion Internet est nécessaire pour envoyer une demande, un message ou un retour. Aucune demande n’a été envoyée.",
    );
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
        <span>{slug ? "Copie enregistrée · lecture sans réseau" : "Vos guides enregistrés"}</span>
        {savedAt && <small>{new Date(savedAt).toLocaleDateString("fr-FR")}</small>}
        <a href="/offline">Mes copies</a>
        {slug && <a href={`/l/${encodeURIComponent(slug)}`}>Version en ligne</a>}
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
          <h1>Guides enregistrés</h1>
          <p>Disponibles sur cet appareil. Une mise à jour nécessite une connexion.</p>
          {copies.map((item) => (
            <article key={item.slug}>
              <a href={`/offline?slug=${encodeURIComponent(item.slug)}`}>{item.guide.name}</a>
              <small>
                {(item.bytes / 1024 / 1024).toFixed(1)} Mo ·{" "}
                {new Date(item.savedAt).toLocaleDateString("fr-FR")}
              </small>
              <button onClick={() => void remove(item.slug).catch((e) => setError(e.message))}>
                Supprimer la copie locale
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
