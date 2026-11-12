import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), report: vi.fn() }));
vi.mock("@tanstack/react-start/server-entry", () => ({ default: { fetch: mocks.fetch } }));
vi.mock("./lib/operational-events.server", () => ({ reportOperationalEvent: mocks.report }));
import server from "./server";
beforeEach(() => vi.clearAllMocks());
const request = new Request("https://host.test/");
describe("compiled SSR wrapper failure signals", () => {
  it.each(["text/html", "text/plain", "application/json"])(
    "reports handled %s 5xx without exposing the error body",
    async (type) => {
      mocks.fetch.mockResolvedValue(
        new Response(type === "application/json" ? "{}" : "Failure", {
          status: 503,
          headers: { "content-type": type },
        }),
      );
      const result = await server.fetch(request, {}, {});
      expect(result.status).toBe(503);
      expect(mocks.report).toHaveBeenCalledExactlyOnceWith("server_request_failed");
    },
  );
  it("normalizes h3 failures and reports them once", async () => {
    mocks.fetch.mockResolvedValue(
      Response.json({ unhandled: true, message: "HTTPError" }, { status: 500 }),
    );
    const result = await server.fetch(request, {}, {});
    expect(result.headers.get("content-type")).toContain("text/html");
    expect(mocks.report).toHaveBeenCalledExactlyOnceWith("server_request_failed");
  });
});
