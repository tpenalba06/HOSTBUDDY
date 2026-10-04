import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { billingPrices, reconcileSubscription, reconcileBillingCheckouts } from "./billing-sync";
const env = { STRIPE_PRICE_BASE: "price_base", STRIPE_PRICE_EXTRA: "price_extra" };
const price = (id: string, amount: number) => ({
  id,
  active: true,
  unit_amount: amount,
  currency: "eur",
  billing_scheme: "per_unit",
  recurring: { interval: "month", interval_count: 1, usage_type: "licensed" },
});
const get = vi.fn(),
  update = vi.fn(),
  cancel = vi.fn(),
  prices = vi.fn();
const list = vi.fn(),
  expire = vi.fn();
const stripe = {
  checkout: { sessions: { list, expire } },
  subscriptions: { retrieve: get, update, cancel },
  prices: { retrieve: prices },
} as unknown as Stripe;
const subscription = (extras: number) => ({
  id: "sub_host",
  status: "active",
  metadata: { organization_id: "org_a" },
  items: {
    has_more: false,
    data: [
      { id: "si_base", price: price("price_base", 999), quantity: 1 },
      ...(extras ? [{ id: "si_extra", price: price("price_extra", 299), quantity: extras }] : []),
    ],
  },
});
describe("property-based billing reconciliation (mocked Stripe)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prices.mockImplementation(async (id) => price(id, id === "price_base" ? 999 : 299));
    update.mockResolvedValue(subscription(5));
    cancel.mockResolvedValue({ id: "sub_host", status: "canceled" });
  });
  it("expires stale and duplicate SaaS checkouts and retains only the current tenant quote", async () => {
    list.mockResolvedValue({
      has_more: false,
      data: [
        {
          id: "cs_old",
          mode: "subscription",
          metadata: { organization_id: "org_a", property_count: "3" },
        },
        {
          id: "cs_current",
          url: "https://checkout.stripe.com/current",
          mode: "subscription",
          metadata: { organization_id: "org_a", property_count: "7" },
        },
        {
          id: "cs_duplicate",
          mode: "subscription",
          metadata: { organization_id: "org_a", property_count: "7" },
        },
        {
          id: "cs_foreign",
          mode: "subscription",
          metadata: { organization_id: "org_b", property_count: "7" },
        },
      ],
    });
    expect((await reconcileBillingCheckouts(stripe, "cus_a", "org_a", 7))?.id).toBe("cs_current");
    expect(expire.mock.calls).toEqual([["cs_old"], ["cs_duplicate"]]);
    expire.mockClear();
    await reconcileBillingCheckouts(stripe, "cus_a", "org_a", 1);
    expect(expire.mock.calls).toEqual([["cs_old"], ["cs_current"], ["cs_duplicate"]]);
  });
  it("does not subscribe a free organization automatically", async () => {
    expect((await reconcileSubscription(stripe, null, 1, 1, env)).action).toBe("no_subscription");
    expect(get).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
  it("updates 3 → 7 properties from one extra to five with stable retries", async () => {
    get.mockResolvedValue(subscription(1));
    await reconcileSubscription(stripe, "sub_host", 7, 12, env);
    expect(update).toHaveBeenCalledWith(
      "sub_host",
      expect.objectContaining({
        items: [
          { id: "si_base", quantity: 1 },
          { id: "si_extra", quantity: 5 },
        ],
        proration_behavior: "create_prorations",
      }),
      { idempotencyKey: "hb-quantity-sub_host-12-7" },
    );
  });
  it("removes the extra line when archived properties leave two", async () => {
    get.mockResolvedValue(subscription(5));
    await reconcileSubscription(stripe, "sub_host", 2, 13, env);
    expect(update.mock.calls[0]![1].items[1]).toEqual({ id: "si_extra", deleted: true });
  });
  it("creates an extra line when a property is restored above two", async () => {
    get.mockResolvedValue(subscription(0));
    await reconcileSubscription(stripe, "sub_host", 3, 14, env);
    expect(update.mock.calls[0]![1].items[1]).toEqual({ price: "price_extra", quantity: 1 });
  });
  it("stops future renewal immediately upon returning to Free", async () => {
    get.mockResolvedValue(subscription(1));
    await reconcileSubscription(stripe, "sub_host", 1, 15, env);
    expect(cancel).toHaveBeenCalledWith(
      "sub_host",
      { prorate: true, invoice_now: false },
      { idempotencyKey: "hb-free-sub_host-15" },
    );
    expect(update).not.toHaveBeenCalled();
  });
  it("does not repeatedly rewrite a correct or canceled subscription", async () => {
    get.mockResolvedValue(subscription(3));
    await reconcileSubscription(stripe, "sub_host", 5, 16, env);
    get.mockResolvedValue({ ...subscription(3), status: "canceled" });
    await reconcileSubscription(stripe, "sub_host", 5, 17, env);
    expect(update).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });
  it("rejects foreign subscription items instead of mutating them blindly", async () => {
    const sub = subscription(1);
    sub.items.data[1]!.price.id = "price_foreign";
    get.mockResolvedValue(sub);
    await expect(reconcileSubscription(stripe, "sub_host", 7, 18, env)).rejects.toThrow(
      "payment_price_mismatch",
    );
    expect(update).not.toHaveBeenCalled();
  });
  it("rejects wrong amounts, metered and transformed Stripe prices", async () => {
    for (const overrides of [
      { unit_amount: 1200 },
      { currency: "usd" },
      { transform_quantity: { divide_by: 2, round: "up" } },
      { recurring: { interval: "month", interval_count: 1, usage_type: "metered" } },
    ]) {
      prices.mockImplementation(async (id) => ({
        ...price(id, id === "price_base" ? 999 : 299),
        ...overrides,
      }));
      await expect(billingPrices(stripe, env)).rejects.toThrow("payment_price_mismatch");
    }
  });
});
