import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("./safe-public-fetch", () => ({ safePublicFetch: mocks.fetch }));
import { robotsAllows, runUrlImport } from "./url-source.server";
const target = new URL("https://source.example.invalid/villa");
describe("robots permission fail closed", () => {
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
});
