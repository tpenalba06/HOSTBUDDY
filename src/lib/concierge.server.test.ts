import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ rpc: vi.fn(), clients: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => {
    state.clients(...args);
    return { rpc: state.rpc };
  },
}));
vi.mock("./data/published-media.server", () => ({
  resolvePublishedMedia: async (guide: unknown) => guide,
}));
import { conciergeResponse, admitConcierge } from "./concierge.server";
beforeEach(() => {
  vi.clearAllMocks();
  state.rpc.mockResolvedValue({
    data: { id: "property", name: "Published", originalLocale: "fr", services: [], sections: [] },
    error: null,
  });
});
const message = (extra = {}) =>
  new Request("https://example.test/api/public/concierge", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": crypto.randomUUID() },
    body: JSON.stringify({ slug: "public", locale: "fr", message: "Services", ...extra }),
  });
it("reads only the anonymous published-guide RPC and returns no-store with no model expense", async () => {
  const response = await conciergeResponse(message());
  expect(response.status).toBe(200);
  expect(state.rpc).toHaveBeenCalledExactlyOnceWith("get_public_guide", { _slug: "public" });
  expect((await response.json()).usage).toEqual({ modelCalls: 0, estimatedCostMicros: 0 });
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it("fails closed for unpublished and malformed requests without using the private database", async () => {
  state.rpc.mockResolvedValueOnce({ data: null, error: null });
  expect((await conciergeResponse(message())).status).toBe(404);
  state.rpc.mockClear();
  expect((await conciergeResponse(message({ token: "another-guest-receipt" }))).status).toBe(400);
  expect(state.rpc).not.toHaveBeenCalled();
  expect((await conciergeResponse(message({ message: "a".repeat(13000) }))).status).toBe(400);
});
it("bounds per-isolate use without ever enabling a paid model", () => {
  const key = crypto.randomUUID();
  for (let index = 0; index < 20; index++) expect(admitConcierge(key, 100000)).toBe(true);
  expect(admitConcierge(key, 100000)).toBe(false);
  expect(admitConcierge(key, 160001)).toBe(true);
});
it("refuses cross-site requests before reading tenant data or contacting a model", async () => {
  const r = message();
  r.headers.set("origin", "https://attacker.invalid");
  expect((await conciergeResponse(r)).status).toBe(403);
  expect(state.rpc).not.toHaveBeenCalled();
});
