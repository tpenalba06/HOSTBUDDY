import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start/server", () => ({ getRequest: vi.fn() }));
import { handleBillingSyncRequest } from "./billing-sync-handler.server";

const secret = "synthetic_billing_sync_secret_for_tests";
function request(token = secret, binding: string | null = secret) {
  return Object.assign(
    new Request("https://preview--test.lovable.app/api/billing-sync", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    }),
    { runtime: { name: "cloudflare", cloudflare: { env: { BILLING_SYNC_SECRET: binding } } } },
  );
}
afterEach(() => vi.unstubAllEnvs());
describe("billing scheduler handler", () => {
  it("uses Cloudflare bindings and runs without a manager session", async () => {
    vi.stubEnv("BILLING_SYNC_SECRET", "stale_node_value");
    const sync = vi.fn().mockResolvedValue({ pending: 0 });
    const response = await handleBillingSyncRequest(request(), sync);
    expect(response.status).toBe(200);
    expect(sync).toHaveBeenCalledOnce();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it.each(["", "wrong", `${secret}x`, "é".repeat(secret.length)])(
    "rejects an invalid token without touching jobs (%s)",
    async (token) => {
      const sync = vi.fn();
      expect((await handleBillingSyncRequest(request(token), sync)).status).toBe(401);
      expect(sync).not.toHaveBeenCalled();
    },
  );
  it("never fills a missing worker binding from process.env", async () => {
    vi.stubEnv("BILLING_SYNC_SECRET", secret);
    const sync = vi.fn();
    expect((await handleBillingSyncRequest(request(secret, null), sync)).status).toBe(401);
    expect(sync).not.toHaveBeenCalled();
  });
  it.each(["sk_live_fixture", undefined])(
    "blocks TEST scheduling against a non-test binding (%s)",
    async (key) => {
      const req = request();
      req.headers.set("x-hostbuddy-billing-mode", "test");
      Object.assign(req.runtime.cloudflare.env, { STRIPE_SECRET_KEY: key });
      const sync = vi.fn();
      expect((await handleBillingSyncRequest(req, sync)).status).toBe(409);
      expect(sync).not.toHaveBeenCalled();
    },
  );
  it("allows explicitly TEST scheduling using request bindings", async () => {
    const req = request();
    req.headers.set("x-hostbuddy-billing-mode", "test");
    Object.assign(req.runtime.cloudflare.env, { STRIPE_SECRET_KEY: "sk_test_fixture" });
    const sync = vi.fn().mockResolvedValue({ pending: 0 });
    expect((await handleBillingSyncRequest(req, sync)).status).toBe(200);
    expect(sync).toHaveBeenCalledOnce();
  });
  it("keeps pending jobs retryable", async () => {
    const response = await handleBillingSyncRequest(request(), async () => ({ pending: 2 }));
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(await response.json()).toEqual({ pending: 2 });
  });
  it("does not expose internal errors or credentials on failure", async () => {
    const response = await handleBillingSyncRequest(request(), async () => {
      throw new Error(secret);
    });
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain(secret);
  });
});
