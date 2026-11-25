import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("./safe-public-fetch", () => ({ safePublicFetch: mocks.fetch }));
import { robotsAllows, runUrlImport } from "./url-source.server";
const target = new URL("https://source.example.invalid/villa");
describe("robots permission fail closed", () => {
  beforeEach(() => mocks.fetch.mockReset());
  it.each([
    ["airbnb", "https://www.airbnb.fr/rooms/1196872767938009585"],
    ["booking", "https://www.booking.com/hotel/fr/de-roubaix.fr.html"],
  ] as const)("sends %s through the normal guarded HTTP path on TEST", async (platform, url) => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VITE_SUPABASE_PROJECT_ID", "mhhtnqfdkyudwyqlmnce");
    vi.stubEnv("VERCEL_PROJECT_ID", "");
    try {
      mocks.fetch
        .mockResolvedValueOnce({
          response: new Response("User-agent: *\nAllow: /"),
          buffer: new TextEncoder().encode("User-agent: *\nAllow: /"),
        })
        .mockResolvedValueOnce({
          response: new Response("Forbidden", { status: 403 }),
          buffer: new Uint8Array(),
        });
      expect(await runUrlImport({ url: url + "?sid=discard", source: "website" })).toEqual({
        ok: false,
        source: platform,
        reason: "blocked",
      });
      expect(mocks.fetch.mock.calls.map(([requested]) => requested)).toEqual([
        new URL("/robots.txt", url).href,
        url,
      ]);
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it.each([
    ["airbnb", "https://www.airbnb.fr/rooms/1086157072408105944"],
    ["booking", "https://www.booking.com/hotel/sc/la-digue-island-lodge.fr.html"],
  ] as const)(
    "distinguishes missing %s authorization before any request",
    async (platform, url) => {
      vi.stubEnv("VERCEL_ENV", "production");
      try {
        const before = mocks.fetch.mock.calls.length;
        expect(await runUrlImport({ url, source: "website" })).toEqual({
          ok: false,
          source: platform,
          reason: "authorization_required",
        });
        expect(mocks.fetch).toHaveBeenCalledTimes(before);
      } finally {
        vi.unstubAllEnvs();
      }
    },
  );
  it("never treats an HTML challenge at robots.txt as permission to fetch a listing", async () => {
    mocks.fetch.mockResolvedValue({
      response: new Response("<html>Checking your browser</html>", {
        headers: { "content-type": "text/html" },
      }),
      buffer: new TextEncoder().encode("<html>Checking your browser</html>"),
    });
    expect(await runUrlImport({ url: target.href, source: "website" })).toEqual({
      ok: false,
      source: "website",
      reason: "blocked",
    });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.fetch.mock.calls[0]![0]).toBe("https://source.example.invalid/robots.txt");
  });
  it("allows a genuinely absent robots file", async () => {
    mocks.fetch.mockResolvedValue({
      response: new Response(null, { status: 404 }),
      buffer: new Uint8Array(),
    });
    expect(await robotsAllows(target)).toBe(true);
  });
  it("reports a failed listing fetch without its private exception or URL", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.fetch.mockResolvedValueOnce({
      response: new Response(null, { status: 404 }),
      buffer: new Uint8Array(),
    });
    mocks.fetch.mockRejectedValueOnce(new Error("PRIVATE signed URL and token"));
    expect(await runUrlImport({ url: target.href, source: "website" })).toEqual({
      ok: false,
      source: "website",
      reason: "unreachable",
    });
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ event: "import_source_unavailable" }),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain("PRIVATE");
    log.mockRestore();
  });
});
