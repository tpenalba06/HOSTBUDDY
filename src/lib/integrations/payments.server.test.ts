import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const state = vi.hoisted(() => ({
  results: [] as unknown[],
  queries: [] as { table: string; calls: unknown[][] }[],
  rpc: vi.fn(),
  create: vi.fn(),
  retrieve: vi.fn(),
  account: vi.fn(),
  refund: vi.fn(),
  intent: vi.fn(),
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const entry = { table, calls: [] as unknown[][] };
      state.queries.push(entry);
      const result = state.results.shift();
      const builder: Record<string, unknown> = {
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: result ?? null, error: null }).then(resolve),
      };
      for (const method of ["select", "eq", "is", "update", "single", "maybeSingle"])
        builder[method] = (...args: unknown[]) => {
          entry.calls.push([method, ...args]);
          return builder;
        };
      return builder;
    },
    rpc: state.rpc,
  },
}));
vi.mock("stripe", () => ({
  default: class {
    checkout = { sessions: { create: state.create, retrieve: state.retrieve } };
    paymentIntents = { retrieve: state.intent };
    refunds = { create: state.refund };
    v2 = { core: { accounts: { retrieve: state.account } } };
  },
}));
import {
  checkoutForToken,
  handleStripeEvent,
  requireOwner,
  refundOrderPayment,
  connectOnboarding,
} from "./payments.server";

describe("service checkout server orchestration (mocked providers)", () => {
  const payment = {
    id: "00000000-0000-4000-8000-000000000001",
    order_id: "order-1",
    organization_id: "org-1",
    stripe_account_id: "acct_host",
    amount_cents: 1500,
    application_fee_cents: 30,
    currency: "eur",
    status: "pending",
    checkout_session_id: null,
    expires_at: "2099-01-01T00:00:00Z",
  };
  beforeEach(() => {
    vi.clearAllMocks();
    state.results = [];
    state.queries = [];
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_synthetic");
    vi.stubEnv("HOSTBUDDY_APP_URL", "https://example.test");
    state.account.mockResolvedValue({
      configuration: { merchant: { capabilities: { card_payments: { status: "active" } } } },
    });
    state.create.mockResolvedValue({
      id: "cs_new",
      status: "open",
      url: "https://checkout.stripe.com/synthetic",
    });
    state.rpc.mockResolvedValue({ data: true, error: null });
  });
  it("takes the price from the tenant's ledger and targets the host account", async () => {
    state.results.push(payment, { status: "confirmed", services: { name: "Breakfast" } });
    await checkoutForToken("a".repeat(64));
    const [params, options] = state.create.mock.calls[0]!;
    expect(params.line_items[0].price_data.unit_amount).toBe(1500);
    expect(params.payment_intent_data.application_fee_amount).toBe(30);
    expect(options.stripeAccount).toBe("acct_host");
    expect(state.queries[1]!.calls).toContainEqual(["eq", "organization_id", "org-1"]);
    expect(
      state.queries.some((q) =>
        q.calls.some((c) => c[0] === "update" && (c[1] as { status?: string }).status === "paid"),
      ),
    ).toBe(false);
  });
  it("preserves legacy zero-fee transactions", async () => {
    state.results.push({ ...payment, application_fee_cents: 0 }, { status: "confirmed" });
    await checkoutForToken("a".repeat(64));
    expect(
      state.create.mock.calls[0]![0].payment_intent_data.application_fee_amount,
    ).toBeUndefined();
  });
  it("requests refund of the platform fee on the host account", async () => {
    state.results.push({ ...payment, status: "paid", payment_intent_id: "pi_host" });
    await refundOrderPayment("org-1", payment.id);
    expect(state.refund).toHaveBeenCalledWith(
      { payment_intent: "pi_host", refund_application_fee: true },
      { stripeAccount: "acct_host", idempotencyKey: `hb-refund-${payment.id}` },
    );
    expect(state.queries[0]!.calls).toContainEqual(["eq", "organization_id", "org-1"]);
  });
  it("requires fee acceptance before Stripe onboarding", async () => {
    vi.stubEnv("STRIPE_CONNECT_WEBHOOK_SECRET", "whsec_synthetic");
    await expect(connectOnboarding("org-1", false)).rejects.toThrow("fee_terms_required");
    expect(state.account).not.toHaveBeenCalled();
    expect(state.queries).toEqual([]);
  });
  it("reuses an open session instead of creating another charge", async () => {
    state.results.push({ ...payment, checkout_session_id: "cs_old" }, { status: "confirmed" });
    state.retrieve.mockResolvedValue({
      id: "cs_old",
      status: "open",
      url: "https://checkout.stripe.com/existing",
    });
    expect((await checkoutForToken("a".repeat(64))).url).toContain("existing");
    expect(state.create).not.toHaveBeenCalled();
  });
  it("renews an expired Stripe session with a stable retry key", async () => {
    state.results.push(
      { ...payment, status: "expired", checkout_session_id: "cs_old" },
      { status: "confirmed" },
    );
    state.retrieve.mockResolvedValue({ id: "cs_old", status: "expired" });
    await checkoutForToken("a".repeat(64));
    expect(state.create.mock.calls[0]![1].idempotencyKey).toBe(
      "hb-service-00000000-0000-4000-8000-000000000001-cs_old",
    );
  });
  it("never charges paid, refunded, cancelled or expired-link orders", async () => {
    for (const status of ["paid", "refunded", "partially_refunded"]) {
      state.results.push({ ...payment, status });
      await expect(checkoutForToken("a".repeat(64))).rejects.toThrow();
    }
    state.results.push(payment, { status: "cancelled" });
    await expect(checkoutForToken("a".repeat(64))).rejects.toThrow("order_not_confirmed");
    state.results.push({ ...payment, expires_at: "2000-01-01T00:00:00Z" });
    await expect(checkoutForToken("a".repeat(64))).rejects.toThrow();
    expect(state.create).not.toHaveBeenCalled();
  });
  it("does not retry a completed checkout while awaiting its webhook", async () => {
    state.results.push({ ...payment, checkout_session_id: "cs_old" }, { status: "confirmed" });
    state.retrieve.mockResolvedValue({ status: "complete" });
    await expect(checkoutForToken("a".repeat(64))).rejects.toThrow();
    expect(state.create).not.toHaveBeenCalled();
  });
  it("binds an early webhook only to a matching account, amount and empty session", async () => {
    await handleStripeEvent({
      id: "evt_early",
      type: "checkout.session.completed",
      account: "acct_host",
      created: 123,
      data: {
        object: {
          id: "cs_new",
          mode: "payment",
          metadata: { payment_id: "00000000-0000-4000-8000-000000000001" },
          payment_status: "paid",
          payment_intent: "pi_1",
          amount_total: 1500,
          currency: "eur",
        },
      },
    } as unknown as Stripe.Event);
    expect(state.queries[0]!.calls).toContainEqual(["eq", "stripe_account_id", "acct_host"]);
    expect(state.queries[0]!.calls).toContainEqual(["eq", "amount_cents", 1500]);
    expect(state.queries[0]!.calls).toContainEqual(["is", "checkout_session_id", null]);
    expect(state.rpc.mock.calls[0]![1]._change.status).toBe("paid");
  });
  it("rejects a paid webhook whose actual Stripe platform fee differs from the ledger", async () => {
    state.results.push({ application_fee_cents: 30 });
    state.intent.mockResolvedValue({ application_fee_amount: 0 });
    await expect(
      handleStripeEvent({
        id: "evt_bad_fee",
        type: "checkout.session.completed",
        account: "acct_host",
        created: 123,
        data: {
          object: {
            id: "cs_fee",
            mode: "payment",
            payment_status: "paid",
            payment_intent: "pi_fee",
            amount_total: 1500,
            currency: "eur",
          },
        },
      } as unknown as Stripe.Event),
    ).rejects.toThrow("payment_fee_mismatch");
    expect(state.rpc).not.toHaveBeenCalled();
    state.results.push({ application_fee_cents: 30 });
    state.intent.mockResolvedValue({ application_fee_amount: 30 });
    await handleStripeEvent({
      id: "evt_good_fee",
      type: "checkout.session.completed",
      account: "acct_host",
      created: 124,
      data: {
        object: {
          id: "cs_fee",
          mode: "payment",
          payment_status: "paid",
          payment_intent: "pi_fee",
          amount_total: 1500,
          currency: "eur",
        },
      },
    } as unknown as Stripe.Event);
    expect(state.rpc.mock.calls[0]![1]._change.status).toBe("paid");
  });
  it("rejects financial access for admins and members", async () => {
    for (const role of ["admin", "member"]) {
      state.results.push({ role });
      await expect(requireOwner("org-1", "user-1")).rejects.toThrow("not_allowed");
    }
  });
  it("ignores a connected merchant's unrelated subscriptions", async () => {
    await handleStripeEvent({
      id: "evt_other",
      type: "customer.subscription.updated",
      account: "acct_host",
      created: 123,
      data: { object: { id: "sub_other", object: "subscription" } },
    } as unknown as Stripe.Event);
    expect(state.rpc.mock.calls[0]![1]._change).toEqual({});
    expect(state.create).not.toHaveBeenCalled();
  });
});
