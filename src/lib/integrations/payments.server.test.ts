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
  createAccount: vi.fn(),
  createAccountLink: vi.fn(),
  price: vi.fn(),
  sessions: vi.fn(),
  propertyCount: 2,
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const entry = { table, calls: [] as unknown[][] };
      state.queries.push(entry);
      const result = state.results.shift();
      const builder: Record<string, unknown> = {
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: result ?? null, error: null, count: state.propertyCount }).then(
            resolve,
          ),
      };
      for (const method of [
        "select",
        "eq",
        "neq",
        "is",
        "update",
        "upsert",
        "single",
        "maybeSingle",
      ])
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
    checkout = {
      sessions: { create: state.create, retrieve: state.retrieve, list: state.sessions },
    };
    prices = { retrieve: state.price };
    paymentIntents = { retrieve: state.intent };
    refunds = { create: state.refund };
    v2 = {
      core: {
        accounts: { retrieve: state.account, create: state.createAccount },
        accountLinks: { create: state.createAccountLink },
      },
    };
  },
}));
import {
  checkoutForToken,
  paymentSummary,
  startBilling,
  handleStripeEvent,
  requireOwner,
  refundOrderPayment,
  connectOnboarding,
  resumeConnectOnboarding,
  connectOverview,
  connectAppOrigin,
  appOrigin,
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
    vi.stubEnv("HOSTBUDDY_CONNECT_APP_URL", "https://example.test");
    state.account.mockImplementation(async (_id, _params, options) => {
      expect(options).toEqual({ apiVersion: "2025-09-30.preview" });
      return {
        configuration: { merchant: { capabilities: { card_payments: { status: "active" } } } },
      };
    });

    state.create.mockResolvedValue({
      id: "cs_new",
      status: "open",
      url: "https://checkout.stripe.com/synthetic",
    });
    state.rpc.mockResolvedValue({ data: true, error: null });
  });
  it("rejects payment links detached by permanent property deletion before provider calls", async () => {
    for (const resolveLink of [paymentSummary, checkoutForToken]) {
      state.results = [{ ...payment, order_id: null }];
      state.queries = [];
      await expect(resolveLink("synthetic-deleted-property-token")).rejects.toThrow(
        "payment_link_unavailable",
      );
      expect(state.queries.map((query) => query.table)).toEqual(["order_payments"]);
      expect(state.account).not.toHaveBeenCalled();
      expect(state.create).not.toHaveBeenCalled();
    }
  });
  it("after effective Free, adding the second property starts a fresh 9.99 subscription", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_synthetic");
    vi.stubEnv("STRIPE_PRICE_BASE", "price_base");
    vi.stubEnv("STRIPE_PRICE_EXTRA", "price_extra");
    state.propertyCount = 2;
    state.results = [
      null,
      null,
      {
        organization_id: "org-1",
        stripe_customer_id: "cus_synthetic",
        stripe_subscription_id: "sub_expired",
        subscription_status: "canceled",
      },
    ];
    state.price.mockImplementation(async (id) => ({
      id,
      active: true,
      currency: "eur",
      unit_amount: id === "price_base" ? 999 : 299,
      recurring: { interval: "month", interval_count: 1, usage_type: "licensed" },
      billing_scheme: "per_unit",
    }));
    state.sessions.mockResolvedValue({ has_more: false, data: [] });
    await startBilling("org-1");
    expect(state.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer: "cus_synthetic",
        line_items: [{ price: "price_base", quantity: 1 }],
      }),
      expect.any(Object),
    );
  });
  it("requires an explicit business country before any database write", async () => {
    vi.stubEnv("STRIPE_CONNECT_WEBHOOK_SECRET", "fictional-secret");
    for (const country of [undefined, "", "France", "1A"]) {
      await expect(connectOnboarding("org-1", true, country)).rejects.toThrow("country_required");
    }
    expect(state.queries).toHaveLength(0);
    expect(state.createAccount).not.toHaveBeenCalled();
  });
  it("onboarding refresh renews the same tenant account without any write or new consent", async () => {
    vi.stubEnv("STRIPE_CONNECT_WEBHOOK_SECRET", "whsec_synthetic");
    state.results = [
      {
        stripe_account_id: "acct_existing",
        service_fee_terms_version: "services-2pct-v1",
        service_fee_terms_accepted_at: "2026-01-01T00:00:00Z",
      },
    ];
    state.createAccountLink.mockResolvedValue({ url: "https://connect.stripe.com/new-single-use" });
    await resumeConnectOnboarding("org-1");
    expect(state.createAccount).not.toHaveBeenCalled();
    expect(state.queries).toEqual([
      {
        table: "organization_payment_accounts",
        calls: [["select", "*"], ["eq", "organization_id", "org-1"], ["maybeSingle"]],
      },
    ]);
    expect(state.createAccountLink.mock.calls[0]![0].account).toBe("acct_existing");
  });
  it("onboarding resume refuses an unlinked tenant or missing stored consent", async () => {
    vi.stubEnv("STRIPE_CONNECT_WEBHOOK_SECRET", "whsec_synthetic");
    for (const row of [
      null,
      { stripe_account_id: null },
      { stripe_account_id: "acct_existing", service_fee_terms_version: null },
    ]) {
      state.results = [row];
      await expect(resumeConnectOnboarding("org-other")).rejects.toThrow();
    }
    expect(state.createAccountLink).not.toHaveBeenCalled();
    expect(state.createAccount).not.toHaveBeenCalled();
  });
  it("onboarding return synchronizes Stripe restrictions, never infers activation or calls Billing", async () => {
    vi.stubEnv("STRIPE_CONNECT_WEBHOOK_SECRET", "whsec_synthetic");
    state.results = [
      { stripe_account_id: "acct_existing", charges_enabled: true, payouts_enabled: true },
      null,
    ];
    state.account.mockResolvedValue({
      configuration: {
        merchant: {
          capabilities: {
            card_payments: { status: "restricted" },
            stripe_balance: { payouts: { status: "restricted" } },
          },
        },
      },
      requirements: {
        entries: [{ description: "external_account", awaiting_action_from: "user" }],
      },
    });
    const result = await connectOverview("org-1");
    expect(result).toMatchObject({
      account: { charges_enabled: false, payouts_enabled: false },
      onboarding: { status: "incomplete", requirements: ["bank"] },
    });
    expect(state.account).toHaveBeenCalledWith(
      "acct_existing",
      { include: ["configuration.merchant", "requirements"] },
      { apiVersion: "2025-09-30.preview" },
    );
    expect(
      state.queries.every(
        (q) =>
          q.table === "organization_payment_accounts" &&
          q.calls.some((c) => c[0] === "eq" && c[1] === "organization_id" && c[2] === "org-1"),
      ),
    ).toBe(true);
    expect(state.rpc).not.toHaveBeenCalled();
    expect(state.create).not.toHaveBeenCalled();
  });
  it("onboarding rejects non-owner and cross-tenant access before any Stripe call", async () => {
    for (const role of [undefined, "member", "admin"]) {
      state.results = [role ? { role } : null];
      await expect(requireOwner("org-1", "user-other")).rejects.toThrow("not_allowed");
    }
    expect(
      state.queries.every((q) =>
        q.calls.some((c) => c[0] === "eq" && c[1] === "user_id" && c[2] === "user-other"),
      ),
    ).toBe(true);
    expect(state.account).not.toHaveBeenCalled();
    expect(state.createAccountLink).not.toHaveBeenCalled();
  });
  it("onboarding has its own HTTPS destination without changing the Billing origin", () => {
    vi.stubEnv("HOSTBUDDY_CONNECT_APP_URL", "https://current-preview.example.test/app/payments");
    expect(connectAppOrigin()).toBe("https://current-preview.example.test");
    expect(appOrigin()).toBe("https://example.test");
    for (const url of ["http://unsafe.test", "https://name:password@unsafe.test"]) {
      vi.stubEnv("HOSTBUDDY_CONNECT_APP_URL", url);
      expect(() => connectAppOrigin()).toThrow();
    }
    vi.stubEnv("HOSTBUDDY_CONNECT_APP_URL", undefined);
    vi.stubEnv("DEV", false);
    expect(connectAppOrigin()).toBe(
      "https://id-preview--ad0b09fe-b134-491b-8601-9d64d6d27b86.lovable.app",
    );
    expect(appOrigin()).toBe("https://example.test");
    vi.stubEnv("DEV", true);
  });
  it("onboarding preserves the existing consent timestamp even for a legacy connect request", async () => {
    vi.stubEnv("STRIPE_CONNECT_WEBHOOK_SECRET", "whsec_synthetic");
    state.results = [
      null,
      {
        stripe_account_id: "acct_existing",
        service_fee_terms_version: "services-2pct-v1",
        service_fee_terms_accepted_at: "2026-01-01T00:00:00Z",
      },
    ];
    state.createAccountLink.mockResolvedValue({ url: "https://connect.stripe.com/renewed" });
    await connectOnboarding("org-1", true, "FR");
    expect(state.queries.some((q) => q.calls.some((c) => c[0] === "update"))).toBe(false);
    expect(state.createAccount).not.toHaveBeenCalled();
  });
  it("sends the chosen country and the proven Connect preview version, preserving billing API", async () => {
    vi.stubEnv("STRIPE_CONNECT_WEBHOOK_SECRET", "fictional-secret");
    state.results.push(null, { stripe_account_id: null }, null, null);
    state.createAccount.mockResolvedValue({ id: "acct_fixture" });
    state.createAccountLink.mockResolvedValue({ url: "https://connect.stripe.com/fixture" });
    await expect(connectOnboarding("org-1", true, "fr")).resolves.toEqual({
      url: "https://connect.stripe.com/fixture",
    });
    expect(state.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        identity: { country: "FR" },
        metadata: { organization_id: "org-1" },
      }),
      { idempotencyKey: "hb-connect-org-1", apiVersion: "2025-09-30.preview" },
    );
    expect(state.createAccountLink).toHaveBeenCalledWith(
      {
        account: "acct_fixture",
        use_case: {
          type: "account_onboarding",
          account_onboarding: {
            configurations: ["merchant"],
            refresh_url: "https://example.test/app/payments?connect=refresh&connectOrg=org-1",
            return_url: "https://example.test/app/payments?connect=return&connectOrg=org-1",
          },
        },
      },
      { apiVersion: "2025-09-30.preview" },
    );
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
