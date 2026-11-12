/* Public guest reader only. No caching of manager pages, API responses or credentials. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
async function storedShell(request) {
  for (const name of (await caches.keys())
    .filter((value) => value.startsWith("hb-guest-shell-"))
    .reverse()) {
    const response = await (await caches.open(name)).match(request);
    if (response) return response;
  }
  return undefined;
}
async function saved(slug) {
  return new Promise((resolve) => {
    const request = indexedDB.open("hostbuddy-guest-offline-v1", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("guides", { keyPath: "slug" });
    request.onerror = () => resolve(false);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction("guides", "readonly");
      const item = transaction.objectStore("guides").get(slug);
      item.onsuccess = () => resolve(Boolean(item.result));
      item.onerror = () => resolve(false);
      transaction.oncomplete = transaction.onabort = () => db.close();
    };
  });
}
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate" && url.pathname === "/offline") {
    event.respondWith((async () => (await storedShell("/offline")) ?? fetch(request))());
    return;
  }
  if (request.mode === "navigate" && /^\/l\/[a-zA-Z0-9_-]{1,80}$/.test(url.pathname)) {
    event.respondWith(
      fetch(request).catch(async () => {
        const slug = url.pathname.split("/")[2];
        if (!(await saved(slug)))
          return new Response(
            "Ce guide n’a pas été enregistré sur cet appareil. Reconnectez-vous à Internet pour l’ouvrir.",
            { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
          );
        return Response.redirect(
          new URL(`/offline?slug=${encodeURIComponent(slug)}`, self.location.origin).href,
          302,
        );
      }),
    );
    return;
  }
  if (/^\/(assets|guide-fonts|hostbuddy-media|demo-guide)\//.test(url.pathname))
    event.respondWith((async () => (await storedShell(request)) ?? fetch(request))());
});
