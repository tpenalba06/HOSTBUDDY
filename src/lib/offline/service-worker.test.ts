import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import { putSnapshot } from "./store";
function worker() {
  const listeners: Record<
    string,
    (event: { request: unknown; respondWith: (promise: Promise<Response>) => void }) => void
  > = {};
  const cache = {
    match: vi.fn(async (request: string) =>
      request === "/offline" ? new Response("offline shell") : undefined,
    ),
  };
  const context = {
    self: {
      location: { origin: "https://hostbuddy.test" },
      addEventListener: (name: string, callback: (typeof listeners)[string]) => {
        listeners[name] = callback;
      },
      skipWaiting: vi.fn(),
      clients: { claim: vi.fn() },
    },
    caches: { keys: async () => ["hb-guest-shell-test"], open: async () => cache },
    indexedDB,
    URL,
    Response,
    fetch: vi.fn().mockRejectedValue(new Error("network disconnected")),
    encodeURIComponent,
  };
  runInNewContext(readFileSync("public/hostbuddy-offline-sw.js", "utf8"), context);
  const request = async (path: string, mode = "navigate", method = "GET") => {
    let result: Promise<Response> | undefined;
    listeners["fetch"]!({
      request: { url: `https://hostbuddy.test${path}`, mode, method },
      respondWith: (value) => {
        result = value;
      },
    });
    return result ? await result : undefined;
  };
  return { request };
}
describe("guest-only offline routing", () => {
  it("opens the cached reader without a network fetch", async () =>
    expect(await (await worker().request("/offline?slug=saved"))!.text()).toBe("offline shell"));
  it("redirects a saved public guide to its local snapshot when disconnected", async () => {
    await putSnapshot({
      version: 1,
      slug: "sw-saved",
      bytes: 0,
      media: [],
      savedAt: "2026-10-03",
      persistent: true,
      shellCache: "hb-guest-shell-test",
      guide: { id: "p", name: "Test", originalLocale: "fr", sections: [] },
    });
    const response = await worker().request("/l/sw-saved");
    expect(response?.status).toBe(302);
    expect(response?.headers.get("location")).toBe("https://hostbuddy.test/offline?slug=sw-saved");
  });
  it("does not pretend an unsaved guide is available", async () =>
    expect((await worker().request("/l/not-saved"))?.status).toBe(503));
  it("lets a shell refresh fetch new HTML instead of reusing navigation cache", async () => {
    expect(await worker().request("/offline", "cors")).toBeUndefined();
  });
  it("never intercepts manager pages, private API responses or POST requests", async () => {
    const { request } = worker();
    expect(await request("/app")).toBeUndefined();
    expect(await request("/_server/publicGuide")).toBeUndefined();
    expect(await request("/l/saved", "navigate", "POST")).toBeUndefined();
  });
});
