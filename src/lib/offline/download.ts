import type { GuideViewData } from "@/components/guest/guide-model";
import { MEDIA_LIMITS } from "@/components/guest/property-media";
import { validateMediaUpload } from "@/lib/data/media-validation";
import {
  listSnapshots,
  mediaDigest,
  putSnapshot,
  readSnapshot,
  verifySnapshot,
  type OfflineSnapshot,
  type SavedMedia,
} from "./store";
const SHELL_LIMIT = 12 * 1024 * 1024;
export const OFFLINE_TOTAL_LIMIT = 150 * 1024 * 1024;
export async function boundedBlob(response: Response, limit: number, signal?: AbortSignal) {
  if (!response.ok || !response.body || response.type === "opaque")
    throw new Error("Un média n’a pas pu être téléchargé. Réessayez avec une connexion.");
  if (Number(response.headers.get("content-length")) > limit)
    throw new Error("Ce guide contient un média trop volumineux pour le hors connexion.");
  const reader = response.body.getReader();
  const chunks: ArrayBuffer[] = [];
  let bytes = 0;
  try {
    while (true) {
      signal?.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) throw new Error("La taille maximale du téléchargement est dépassée.");
      chunks.push(new Uint8Array(value).buffer);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  if (!bytes) throw new Error("Un média téléchargé est vide. Réessayez.");
  return new Blob(chunks, {
    type: response.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream",
  });
}
function safeMediaURL(value: string) {
  const url = new URL(value, location.origin);
  const backend = new URL(import.meta.env["VITE_SUPABASE_URL"]).origin;
  if (
    url.username ||
    url.password ||
    ![location.origin, backend].includes(url.origin) ||
    !["https:", "http:"].includes(url.protocol)
  )
    throw new Error("Un média de ce guide ne peut pas être enregistré hors connexion.");
  return url.href;
}
async function prepareShell(signal?: AbortSignal) {
  if (!navigator.serviceWorker || !window.isSecureContext || !globalThis.caches)
    throw new Error(
      "Le hors connexion n’est pas disponible dans ce navigateur. Ouvrez le guide dans Chrome ou Safari.",
    );
  const registration = await navigator.serviceWorker.register("/hostbuddy-offline-sw.js", {
    scope: "/",
  });
  if (!registration.active)
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Le mode hors connexion n’a pas pu démarrer. Réessayez.")),
        20_000,
      );
      const worker = registration.installing ?? registration.waiting;
      if (!worker) {
        clearTimeout(timer);
        reject(new Error("Le mode hors connexion n’a pas pu démarrer."));
        return;
      }
      const check = () => {
        if (worker.state === "activated") {
          clearTimeout(timer);
          worker.removeEventListener("statechange", check);
          resolve();
        }
        if (worker.state === "redundant") {
          clearTimeout(timer);
          reject(new Error("Le mode hors connexion n’a pas pu démarrer."));
        }
      };
      worker.addEventListener("statechange", check);
      check();
    });
  const response = await fetch("/offline-assets.json", {
    signal: signal ?? null,
    credentials: "omit",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Le téléchargement du guide est indisponible. Réessayez.");
  const manifest = (await response.json()) as { version: string; assets: string[] };
  if (
    !/^[a-f0-9]{20}$/.test(manifest.version) ||
    !Array.isArray(manifest.assets) ||
    manifest.assets.length > 250 ||
    manifest.assets.some(
      (path) =>
        !/^\/(assets|guide-fonts|hostbuddy-media|demo-guide)\/[a-zA-Z0-9._/-]+$/.test(path) ||
        path.includes(".."),
    )
  )
    throw new Error("Le téléchargement du guide est indisponible.");
  const name = `hb-guest-shell-${manifest.version}`;
  const cache = await caches.open(name);
  let bytes = 0;
  // No manager HTML, sessions, RPC results or private responses are cached.
  for (const path of ["/offline", ...manifest.assets]) {
    signal?.throwIfAborted();
    const existing = await cache.match(path);
    if (existing) {
      bytes += (await existing.blob()).size;
      continue;
    }
    const result = await fetch(path, {
      signal: signal ?? null,
      credentials: "omit",
      cache: "reload",
    });
    if (path === "/offline" && !result.headers.get("content-type")?.includes("text/html"))
      throw new Error("Le lecteur hors connexion n’a pas pu être chargé.");
    const blob = await boundedBlob(result, SHELL_LIMIT - bytes, signal);
    bytes += blob.size;
    await cache.put(
      path,
      new Response(blob, {
        headers: { "content-type": result.headers.get("content-type") ?? blob.type },
      }),
    );
  }
  if (bytes > SHELL_LIMIT) throw new Error("Le lecteur hors connexion est trop volumineux.");
  return name;
}
async function performSaveGuideOffline(
  guide: GuideViewData,
  slug: string,
  onProgress: (value: string) => void,
  signal?: AbortSignal,
) {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(slug)) throw new Error("Ce guide ne peut pas être enregistré.");
  onProgress("Préparation du guide…");
  const previous = await listSnapshots();
  const used = previous
    .filter((item) => item.slug !== slug)
    .reduce((sum, item) => sum + item.bytes, 0);
  if (used + MEDIA_LIMITS.guideOfflineBytes > OFFLINE_TOTAL_LIMIT)
    throw new Error("Supprimez un ancien guide enregistré pour libérer de l’espace.");
  const estimate = await navigator.storage?.estimate?.();
  if (
    estimate?.quota &&
    estimate.quota - (estimate.usage ?? 0) < MEDIA_LIMITS.guideOfflineBytes + SHELL_LIMIT
  )
    throw new Error("L’espace disponible est insuffisant. Libérez de l’espace puis réessayez.");
  const shellCache = await prepareShell(signal);
  const media: SavedMedia[] = [];
  let bytes = 0;
  const sources = guide.sections.flatMap((section) =>
    (section.media ?? []).map((item) => ({
      id: item.id,
      url: item.url,
      video: item.type === "video",
    })),
  );
  for (const item of guide.services ?? [])
    if (item.imagePath)
      sources.push({ id: `service:${item.id}`, url: item.imagePath, video: false });
  const unique = sources.filter(
    (item, index) => sources.findIndex((other) => other.id === item.id) === index,
  );
  for (const [index, item] of unique.entries()) {
    signal?.throwIfAborted();
    if (!item.url)
      throw new Error("Un média n’est pas disponible. Rechargez le guide avant de l’enregistrer.");
    onProgress(`Enregistrement des médias · ${index + 1}/${unique.length}`);
    const response = await fetch(safeMediaURL(item.url), {
      credentials: "omit",
      signal: signal ?? null,
    });
    const limit = Math.min(
      item.video ? MEDIA_LIMITS.videoOfflineBytes : 10 * 1024 * 1024,
      MEDIA_LIMITS.guideOfflineBytes - bytes,
    );
    const blob = await boundedBlob(response, limit, signal);
    if (item.video) await validateMediaUpload(new File([blob], "video", { type: blob.type }));
    else if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(blob.type))
      throw new Error("Une photo du guide n’a pas pu être vérifiée.");
    bytes += blob.size;
    media.push({ id: item.id, blob, digest: await mediaDigest(blob) });
  }
  // Signed URLs are discarded. The restored reader uses complete local blobs.
  const snapshot: OfflineSnapshot = {
    version: 1,
    slug,
    savedAt: new Date().toISOString(),
    bytes,
    media,
    shellCache,
    persistent: (await navigator.storage?.persist?.().catch(() => false)) ?? false,
    guide: {
      ...guide,
      sections: guide.sections.map((section) => ({
        ...section,
        media:
          section.media?.map((item) =>
            (({ posterUrl: _poster, ...rest }) => ({ ...rest, url: null }))(item),
          ) ?? [],
      })),
      services: guide.services?.map((item) => ({ ...item, imagePath: null })) ?? [],
    },
  };
  onProgress("Vérification de l’enregistrement…");
  signal?.throwIfAborted();
  await verifySnapshot(snapshot);
  // Atomic transaction: an interrupted update retains the previous complete snapshot.
  await putSnapshot(snapshot);
  const saved = await readSnapshot(slug);
  if (!saved) throw new Error("L’enregistrement du guide a échoué.");
  await verifySnapshot(saved);
  const retained = new Set((await listSnapshots()).map((item) => item.shellCache));
  for (const name of await caches.keys())
    if (name.startsWith("hb-guest-shell-") && !retained.has(name)) await caches.delete(name);
  return saved;
}

export async function saveGuideOffline(
  guide: GuideViewData,
  slug: string,
  onProgress: (value: string) => void,
  signal?: AbortSignal,
) {
  const task = async () => {
    try {
      return await performSaveGuideOffline(guide, slug, onProgress, signal);
    } finally {
      // Discard interrupted shell downloads without removing a complete saved guide.
      try {
        const retained = new Set((await listSnapshots()).map((item) => item.shellCache));
        for (const name of await caches.keys())
          if (name.startsWith("hb-guest-shell-") && !retained.has(name)) await caches.delete(name);
      } catch {
        /* The original storage error remains the useful feedback. */
      }
    }
  };
  if (navigator.locks)
    return navigator.locks.request("hostbuddy-offline-save", signal ? { signal } : {}, task);
  return task();
}
