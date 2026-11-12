import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("node:dns/promises", () => ({
  resolve4: vi.fn(async () => ["93.184.216.34"]),
  resolve6: vi.fn(async () => []),
}));
import { resolve4 } from "node:dns/promises";
import { safePublicFetch } from "./safe-public-fetch";

afterEach(() => vi.unstubAllGlobals());
describe("public import redirect permissions", () => {
  it("cancels a stalled DNS lookup without sending an HTTP request", async () => {
    vi.mocked(resolve4).mockImplementationOnce(() => new Promise(() => {}));
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const controller = new AbortController();
    const pending = safePublicFetch(
      "https://source.example.invalid/villa",
      { signal: controller.signal },
      1000,
    );
    controller.abort();
    await expect(pending).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("honors caller cancellation before any DNS or network request", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(
      safePublicFetch("https://source.example.invalid/villa", { signal: controller.signal }, 1000),
    ).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("keeps the same bounded signal across redirects instead of restarting its deadline", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/next" } }))
      .mockResolvedValueOnce(new Response("ok"));
    vi.stubGlobal("fetch", fetch);
    await safePublicFetch("https://source.example.invalid/villa", {}, 1000);
    expect(fetch.mock.calls[0]![1].signal).toBe(fetch.mock.calls[1]![1].signal);
  });

  it("never requests the redirect destination when its robots policy refuses access", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://other.example.invalid/private" },
        }),
    );
    vi.stubGlobal("fetch", fetch);
    const permission = vi.fn(async (url: URL) => url.pathname !== "/private");
    await expect(
      safePublicFetch("https://source.example.invalid/villa", {}, 1000, permission),
    ).rejects.toThrow("blocked");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(permission.mock.calls[0]?.[0]).toEqual(new URL("https://other.example.invalid/private"));
  });
  it("returns the permitted final URL so relative image provenance resolves correctly", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: "/new/villa" } }),
      )
      .mockResolvedValueOnce(
        new Response("Synthetic listing", { headers: { "content-type": "text/html" } }),
      );
    vi.stubGlobal("fetch", fetch);
    const result = await safePublicFetch(
      "https://source.example.invalid/villa",
      {},
      1000,
      async () => true,
    );
    expect(result.url).toBe("https://source.example.invalid/new/villa");
    expect(new TextDecoder().decode(result.buffer)).toBe("Synthetic listing");
  });
});
