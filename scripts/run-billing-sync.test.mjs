import { describe, it, expect, vi } from "vitest";
import { runBillingSync } from "./run-billing-sync.mjs";
const endpoint = "https://preview--host-buddy-concierge.lovable.app/api/billing-sync";
const secret = "synthetic_scheduler_secret_not_a_real_key";
describe("preview billing scheduler runner", () => {
  it("retries a temporary failure and succeeds without a user session", async () => {
    const send = vi.fn().mockResolvedValueOnce({ status: 503 }).mockResolvedValue({ ok: true });
    const wait = vi.fn();
    await runBillingSync({ endpoint, secret, send, wait });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][1].redirect).toBe("error");
    expect(wait).toHaveBeenCalledOnce();
  });
  it("does not retry rejected credentials", async () => {
    const send = vi.fn().mockResolvedValue({ status: 401 });
    await expect(runBillingSync({ endpoint, secret, send })).rejects.toThrow("rejected");
    expect(send).toHaveBeenCalledOnce();
  });
  it("bounds retries on network failure", async () => {
    const send = vi.fn().mockRejectedValue(new Error(secret));
    await expect(runBillingSync({ endpoint, secret, send, wait: vi.fn() })).rejects.toThrow(
      "retry_exhausted",
    );
    expect(send).toHaveBeenCalledTimes(4);
  });
  it.each([
    "https://hostbuddy.example/api/billing-sync",
    "https://preview--host-buddy-concierge.lovable.app/api/billing-sync?token=secret",
    "https://preview--host-buddy-concierge.lovable.app/api/other",
    "http://preview--host-buddy-concierge.lovable.app/api/billing-sync",
  ])("rejects a non-preview destination before transmitting a token (%s)", async (url) => {
    const send = vi.fn();
    await expect(runBillingSync({ endpoint: url, secret, send })).rejects.toThrow("invalid");
    expect(send).not.toHaveBeenCalled();
  });
});
