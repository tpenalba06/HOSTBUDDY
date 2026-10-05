import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("node:dns/promises", () => ({
  resolve4: vi.fn(async () => ["93.184.216.34"]),
  resolve6: vi.fn(async () => []),
}));
import { safePublicFetch } from "./safe-public-fetch";

afterEach(() => vi.unstubAllGlobals());
describe("public import redirect permissions", () => {
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
