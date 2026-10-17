// New booking-receipt entry only. The acquired Billing/Connect suites are not
// rerun. Stripe is a stub here; this is not a hosted Stripe TEST payment proof.
import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  results: [] as unknown[],
  queries: [] as { table: string; calls: unknown[][] }[],
  create: vi.fn(),
  account: vi.fn(),
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const entry = { table, calls: [] as unknown[][] };
      state.queries.push(entry);
      const result = state.results.shift();
      const builder: Record<string, unknown> = {
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({ data: result ?? null, error: null }).then(resolve),
      };
      for (const method of ["select", "eq", "gte", "maybeSingle", "single", "update"])
        builder[method] = (...args: unknown[]) => {
          entry.calls.push([method, ...args]);
          return builder;
        };
      return builder;
    },
  },
}));
vi.mock("./payment-environment.server", () => ({
  paymentServerEnvironment: () => ({
    STRIPE_SECRET_KEY: "sk_test_fixture",
    HOSTBUDDY_APP_URL: "https://shop.example.test",
  }),
}));
vi.mock("stripe", () => ({
  default: class {
    v2 = { core: { accounts: { retrieve: state.account } } };
    checkout = { sessions: { create: state.create } };
  },
}));
import { checkoutForToken, paymentSummary } from "./payments.server";
const payment = {
  id: "payment-fixture",
  order_id: "order-fixture",
  organization_id: "org-fixture",
  stripe_account_id: "acct_fixture",
  amount_cents: 2500,
  application_fee_cents: 50,
  currency: "eur",
  status: "pending",
  expires_at: new Date(Date.now() + 86400000).toISOString(),
  checkout_session_id: null,
};
const receiptOrder = { id: "order-fixture", organization_id: "org-fixture" };
beforeEach(() => {
  state.results = [];
  state.queries = [];
  vi.clearAllMocks();
  state.account.mockResolvedValue({
    configuration: { merchant: { capabilities: { card_payments: { status: "active" } } } },
  });
  state.create.mockResolvedValue({
    id: "cs_test_fixture",
    url: "https://checkout.example.test/session",
    status: "open",
  });
});
it("resumes the manager-issued checkout from the private booking receipt with the same quote and 2%", async () => {
  state.results.push(
    null,
    receiptOrder,
    payment,
    { status: "confirmed", services: { name: "Synthetic service" } },
    null,
    null,
  );
  expect(await checkoutForToken("a".repeat(64))).toEqual({
    url: "https://checkout.example.test/session",
  });
  const [params, options] = state.create.mock.calls[0]!;
  expect(params.line_items[0].price_data.unit_amount).toBe(2500);
  expect(params.payment_intent_data.application_fee_amount).toBe(50);
  expect(options.stripeAccount).toBe("acct_fixture");
  expect(
    state.queries
      .find((item) => item.table === "orders")
      ?.calls.some((call) => call[0] === "gte" && call[1] === "created_at"),
  ).toBe(true);
  expect(state.queries[2]?.calls).toContainEqual(["eq", "organization_id", "org-fixture"]);
  expect(
    state.queries
      .filter((item) => item.table === "order_payments")
      .flatMap((item) => item.calls)
      .filter((call) => call[0] === "update"),
  ).not.toContainEqual(["update", { status: "paid" }]);
});
it("a confirmed booking is still unpaid and an unknown receipt cannot enter checkout", async () => {
  state.results.push(null, receiptOrder, payment, {
    status: "confirmed",
    services: { name: "Synthetic service" },
  });
  expect(await paymentSummary("a".repeat(64))).toMatchObject({
    status: "pending",
    canPay: true,
    amountCents: 2500,
  });
  state.results.push(null, null);
  await expect(checkoutForToken("b".repeat(64))).rejects.toThrow("payment_link_unavailable");
  expect(state.create).not.toHaveBeenCalled();
});
