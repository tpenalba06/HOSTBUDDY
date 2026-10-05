import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  env: { STRIPE_WEBHOOK_SECRET: "fictional-webhook-secret" },
  verify: vi.fn(),
  handle: vi.fn(),
  client: vi.fn(() => ({})),
}));
vi.mock("./payment-environment.server", () => ({ paymentServerEnvironment: () => state.env }));
vi.mock("./payments.server", () => ({
  stripeClient: state.client,
  handleStripeEvent: state.handle,
}));
vi.mock("./stripe-webhook.server", () => ({ verifyStripeWebhook: state.verify }));
import { handleStripeWebhookRequest } from "./stripe-webhook-handler.server";
const request = (body: string, signature?: string) =>
  new Request("https://preview.example.test/api/public/stripe-webhook", {
    method: "POST",
    body,
    headers: signature ? { "stripe-signature": signature } : {},
  });
beforeEach(() => {
  vi.clearAllMocks();
  state.verify.mockResolvedValue({ id: "fixture-event", livemode: false });
  state.handle.mockResolvedValue(undefined);
});
describe("public webhook uses the same authenticated handler as the legacy route", () => {
  it("rejects unsigned requests before loading Stripe or processing events", async () => {
    expect((await handleStripeWebhookRequest(request("{}"))).status).toBe(400);
    expect(state.client).not.toHaveBeenCalled();
    expect(state.handle).not.toHaveBeenCalled();
  });
  it("rejects an invalid signature and never processes its contents", async () => {
    state.verify.mockRejectedValueOnce(new Error("invalid signature"));
    expect((await handleStripeWebhookRequest(request("{}", "invalid"))).status).toBe(400);
    expect(state.handle).not.toHaveBeenCalled();
  });
  it("bounds request bytes before signature processing", async () => {
    expect((await handleStripeWebhookRequest(request("a".repeat(512001), "fixture"))).status).toBe(
      413,
    );
    expect(state.verify).not.toHaveBeenCalled();
  });
  it("preserves raw UTF-8 for verification and acknowledges only handled events", async () => {
    const raw = '{"description":"Séjour fictif ☀"}';
    expect((await handleStripeWebhookRequest(request(raw, "fixture"))).status).toBe(200);
    expect(state.verify).toHaveBeenCalledWith({}, raw, "fixture", {
      platform: "fictional-webhook-secret",
      connect: undefined,
    });
    expect(state.handle).toHaveBeenCalledWith({ id: "fixture-event", livemode: false });
    state.handle.mockRejectedValueOnce(new Error("private database detail"));
    const failed = await handleStripeWebhookRequest(request(raw, "fixture"));
    expect(failed.status).toBe(503);
    expect(await failed.text()).toBe("Retry later");
  });
});
