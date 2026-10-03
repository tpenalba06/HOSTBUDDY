import type { GuideViewData } from "@/components/guest/guide-model";
export const OFFLINE_DB = "hostbuddy-guest-offline-v1";
export const OFFLINE_STORE = "guides";
export interface SavedMedia {
  id: string;
  blob: Blob;
  digest: string;
}
export interface OfflineSnapshot {
  version: 1;
  slug: string;
  savedAt: string;
  guide: GuideViewData;
  media: SavedMedia[];
  bytes: number;
  shellCache: string;
  persistent: boolean;
}
function openDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(OFFLINE_STORE, { keyPath: "slug" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("Le stockage local n’est pas disponible sur cet appareil."));
    request.onblocked = () =>
      reject(new Error("Fermez les autres onglets du guide puis réessayez."));
  });
}
async function operation<T>(
  mode: IDBTransactionMode,
  task: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const db = await openDB();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(OFFLINE_STORE, mode);
      const request = task(transaction.objectStore(OFFLINE_STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = transaction.onerror = () =>
        reject(new Error("L’enregistrement local a échoué. Libérez de l’espace puis réessayez."));
    });
  } finally {
    db.close();
  }
}
export const putSnapshot = (snapshot: OfflineSnapshot) =>
  operation("readwrite", (store) => store.put(snapshot));
export const readSnapshot = (slug: string) =>
  operation<OfflineSnapshot | undefined>("readonly", (store) => store.get(slug));
export const listSnapshots = () =>
  operation<OfflineSnapshot[]>("readonly", (store) => store.getAll());
export const deleteSnapshot = (slug: string) =>
  operation("readwrite", (store) => store.delete(slug));
export async function mediaDigest(blob: Blob) {
  const hash = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
export async function verifySnapshot(snapshot: OfflineSnapshot) {
  if (
    snapshot.version !== 1 ||
    snapshot.media.reduce((sum, item) => sum + item.blob.size, 0) !== snapshot.bytes
  )
    throw new Error(
      "Cette copie du guide est incomplète. Enregistrez-la à nouveau avec une connexion.",
    );
  for (const item of snapshot.media) {
    if (!item.blob.size || (await mediaDigest(item.blob)) !== item.digest)
      throw new Error("Un média enregistré est incomplet. Enregistrez le guide à nouveau.");
  }
}
export function restoreGuide(snapshot: OfflineSnapshot) {
  const urls = new Map(snapshot.media.map((item) => [item.id, URL.createObjectURL(item.blob)]));
  const guide: GuideViewData = {
    ...snapshot.guide,
    sections: snapshot.guide.sections.map((section) => ({
      ...section,
      media: section.media?.map((item) => ({ ...item, url: urls.get(item.id) ?? null })) ?? [],
    })),
    services:
      snapshot.guide.services?.map((item) => ({
        ...item,
        imagePath: urls.get(`service:${item.id}`) ?? item.imagePath ?? null,
      })) ?? [],
  };
  return { guide, dispose: () => urls.forEach((url) => URL.revokeObjectURL(url)) };
}
