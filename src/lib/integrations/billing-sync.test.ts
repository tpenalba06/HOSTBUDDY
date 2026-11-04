import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import {
  billingPrices,
  reconcileSubscription,
  reconcileBillingCheckouts,
  type BillingCapacity,
} from "./billing-sync";
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
  prices = vi.fn(),
  list = vi.fn(),
  expire = vi.fn();
const schedules = { retrieve: vi.fn(), create: vi.fn(), update: vi.fn() };
let state: BillingCapacity | null;
type FixtureItem = {
  price: ReturnType<typeof price>;
  quantity: number;
  id: string;
  current_period_start: number;
  current_period_end: number;
};
type FixturePhase = {
  start_date: number;
  end_date?: number;
  items: { price: string; quantity: number }[];
};
type FixtureInvoice = {
  id: string;
  status: string;
  billing_reason: string;
  parent: { subscription_details: { subscription: string } };
  lines: {
    has_more: boolean;
    data: {
      quantity: number;
      pricing: { price_details: { price: string } };
      period: { start: number; end: number };
      parent: { subscription_item_details: { proration: boolean } };
    }[];
  };
};
let sub: {
  id: string;
  status: string;
  metadata: Record<string, string>;
  schedule: string | null;
  items: { has_more: boolean; data: FixtureItem[] };
  latest_invoice: FixtureInvoice;
};
let schedule: {
  id: string;
  status: string;
  metadata: Record<string, string>;
  end_behavior: string;
  phases: FixturePhase[];
};

let invoiceSerial: number;
const store = {
  guard: vi.fn(async () => {}),
  read: async () => state && structuredClone(state),
  write: vi.fn(async (value: BillingCapacity) => {
    state = structuredClone(value);
  }),
};
const stripe = {
  checkout: { sessions: { list, expire } },
  subscriptions: { retrieve: get, update, cancel },
  subscriptionSchedules: schedules,
  prices: { retrieve: prices },
} as unknown as Stripe;
const items = (count: number) => [
  { price: price("price_base", 999), quantity: 1 },
  ...(count > 2 ? [{ price: price("price_extra", 299), quantity: count - 2 }] : []),
];
const paidInvoice = (count: number, reason = "subscription_cycle"): FixtureInvoice => ({
  id: `in_${++invoiceSerial}`,
  status: "paid",
  billing_reason: reason,
  parent: { subscription_details: { subscription: "sub_host" } },
  lines: {
    has_more: false,
    data: items(count).map((item) => ({
      quantity: item.quantity,
      pricing: { price_details: { price: item.price.id } },
      period: {
        start: sub.items.data[0]!.current_period_start,
        end: sub.items.data[0]!.current_period_end,
      },
      parent: { subscription_item_details: { proration: reason === "subscription_update" } },
    })),
  },
});
function setup(count: number) {
  state = null;
  schedule = { id: "", status: "", metadata: {}, end_behavior: "", phases: [] };
  invoiceSerial = 0;
  sub = {
    id: "sub_host",
    status: "active",
    metadata: { organization_id: "org_a" },
    schedule: null,
    latest_invoice: {} as FixtureInvoice,
    items: {
      has_more: false,
      data: items(count).map((item, i) => ({
        ...item,
        id: `si_${i}`,
        current_period_start: 1000,
        current_period_end: 2600,
      })),
    },
  };
  sub.latest_invoice = paidInvoice(count);
}
const reconcile = (count: number, revision = 1) =>
  reconcileSubscription(stripe, "sub_host", count, revision, env, store);
function renew() {
  const next = schedule.phases[1];
  if (!next) {
    sub.status = "canceled";
    return;
  }
  sub.items.data = next.items.map((item, i) => ({
    ...item,
    id: `si_${i}`,
    price: price(item.price, item.price === "price_base" ? 999 : 299),
    current_period_start: 2600,
    current_period_end: 4200,
  }));
  schedule.phases = [{ ...next, end_date: 4200 }];
  sub.latest_invoice = paidInvoice(2 + (next.items[1]?.quantity ?? 0));
}
describe("paid-period capacity and renewal (mocked Stripe, not a network validation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setup(14);
    prices.mockImplementation(async (id) => price(id, id === "price_base" ? 999 : 299));
    get.mockImplementation(async () => structuredClone(sub));
    schedules.create.mockImplementation(async () => {
      schedule = {
        id: "sched_host",
        status: "active",
        metadata: {},
        end_behavior: "release",
        phases: [
          {
            start_date: sub.items.data[0]!.current_period_start,
            end_date: sub.items.data[0]!.current_period_end,
            items: sub.items.data.map((item) => ({
              price: item.price.id,
              quantity: item.quantity,
            })),
          },
        ],
      };
      sub.schedule = schedule.id;
      return structuredClone(schedule);
    });
    schedules.retrieve.mockImplementation(async () => structuredClone(schedule));
    schedules.update.mockImplementation(
      async (
        _id: string,
        params: {
          proration_behavior: string;
          phases: FixturePhase[];
          metadata: Record<string, string>;
          end_behavior: string;
        },
      ) => {
        schedule = { ...schedule, ...structuredClone(params) };
        if (params.proration_behavior === "always_invoice") {
          const count = 2 + (params.phases[0]!.items[1]?.quantity ?? 0);
          sub.items.data = params.phases[0]!.items.map((item, i) => ({
            ...item,
            id: `si_${i}`,
            price: price(item.price, item.price === "price_base" ? 999 : 299),
            current_period_start: state!.periodStart,
            current_period_end: state!.periodEnd,
          }));
          sub.latest_invoice = paidInvoice(count, "subscription_update");
        }
        return structuredClone(schedule);
      },
    );
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
  it("never starts a subscription automatically and ignores canceled subscriptions", async () => {
    expect((await reconcileSubscription(stripe, null, 2, 1, env, store)).action).toBe(
      "no_subscription",
    );
    sub.status = "canceled";
    expect((await reconcile(2)).action).toBe("inactive");
    expect(schedules.create).not.toHaveBeenCalled();
  });
  it("14 → 13 retains paid 14, schedules 13 and never creates a credit", async () => {
    await reconcile(13);
    expect(state).toMatchObject({ paidCapacity: 14, renewalQuantity: 13 });
    expect(schedule.phases[0]!.items[1]!.quantity).toBe(12);
    expect(schedule.phases[1]!.items[1]!.quantity).toBe(11);
    expect(schedules.update.mock.calls[0]![1]!.proration_behavior).toBe("none");
    expect(cancel).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
  it("14 → 13 → 14 has no additional financial movement", async () => {
    await reconcile(13);
    await reconcile(14, 2);
    expect(state!.paidCapacity).toBe(14);
    expect(
      schedules.update.mock.calls.every((call) => call[1]!.proration_behavior === "none"),
    ).toBe(true);
    expect(schedule.phases[1]!.items[1]!.quantity).toBe(12);
  });
  it("14 → 13 → 15 invoices only one additional property immediately", async () => {
    await reconcile(13);
    await reconcile(15, 2);
    const params = schedules.update.mock.calls[1]![1];
    expect(params.proration_behavior).toBe("always_invoice");
    expect(params.phases[0]!.items[1]!.quantity - 12).toBe(1);
    expect(state!.paidCapacity).toBe(15);
    await reconcile(15, 2);
    expect(schedules.update).toHaveBeenCalledTimes(2);
  });
  it("14 → 13 → renewal → 14 charges the newly added property", async () => {
    await reconcile(13);
    renew();
    await reconcile(14, 2);
    expect(state).toMatchObject({ periodStart: 2600, paidCapacity: 14 });
    expect(schedules.update.mock.calls[1]![1]!.proration_behavior).toBe("always_invoice");
    expect(schedules.update.mock.calls[1]![1]!.phases[0]!.items[1]!.quantity - 11).toBe(1);
  });
  it("2 → 1 becomes free only at period end, without credit", async () => {
    setup(2);
    await reconcile(1);
    expect(state).toMatchObject({ paidCapacity: 2, periodEnd: 2600, renewalQuantity: 1 });
    expect(schedule.phases).toHaveLength(1);
    expect(schedule.end_behavior).toBe("cancel");
    expect(schedules.update.mock.calls[0]![1]!.proration_behavior).toBe("none");
    expect(sub.status).toBe("active");
    renew();
    expect(sub.status).toBe("canceled");
  });
  it("2 → 1 → 2 does not charge another 9.99 before expiry", async () => {
    setup(2);
    await reconcile(1);
    await reconcile(2, 2);
    expect(schedule.end_behavior).toBe("release");
    expect(schedule.phases).toHaveLength(2);
    expect(
      schedules.update.mock.calls.every((call) => call[1]!.proration_behavior === "none"),
    ).toBe(true);
  });
  it("after effective free, 1 → 2 requires a new subscription", async () => {
    setup(2);
    await reconcile(1);
    renew();
    expect((await reconcile(2, 2)).action).toBe("inactive");
    expect(sub.status).toBe("canceled");
    expect(cancel).not.toHaveBeenCalled();
  });
  it.each(["archive", "delete"])("%s uses the same authoritative active count", async () => {
    await reconcile(13);
    expect(state).toMatchObject({ paidCapacity: 14, renewalQuantity: 13 });
  });
  it("an unpaid upgrade never increases paid capacity and a paid retry never charges twice", async () => {
    await reconcile(13);
    const original = schedules.update.getMockImplementation()!;
    schedules.update.mockImplementation(async (...args) => {
      const result = await original(...args);
      sub.latest_invoice.status = "open";
      return result;
    });
    await expect(reconcile(15, 2)).rejects.toThrow("billing_payment_pending");
    expect(state!.paidCapacity).toBe(14);
    await expect(reconcile(15, 2)).rejects.toThrow("billing_payment_pending");
    expect(schedules.update).toHaveBeenCalledTimes(2);
    sub.latest_invoice.status = "paid";
    schedules.update.mockImplementation(original);
    await reconcile(15, 2);
    expect(state!.paidCapacity).toBe(15);
    expect(
      schedules.update.mock.calls.filter(
        (call) => call[1]!.proration_behavior === "always_invoice",
      ),
    ).toHaveLength(1);
  });
  it("a failed upgrade followed by deletion still lowers renewal without credit or paid entitlement", async () => {
    await reconcile(13);
    const original = schedules.update.getMockImplementation()!;
    schedules.update.mockImplementation(async (...args) => {
      const result = await original(...args);
      sub.latest_invoice.status = "open";
      return result;
    });
    await expect(reconcile(15, 2)).rejects.toThrow("billing_payment_pending");
    await expect(reconcile(13, 3)).rejects.toThrow("billing_payment_pending");
    expect(state).toMatchObject({ paidCapacity: 14, renewalQuantity: 13 });
    expect(schedule.phases[0]!.items[1]!.quantity).toBe(13);
    expect(schedule.phases[1]!.items[1]!.quantity).toBe(11);
    expect(schedules.update.mock.calls[2]![1].proration_behavior).toBe("none");
  });
  it("an expired organization lease stops a stale worker before any financial mutation", async () => {
    store.guard.mockRejectedValueOnce(new Error("billing lease expired"));
    await expect(reconcile(15)).rejects.toThrow("billing lease expired");
    expect(schedules.create).not.toHaveBeenCalled();
    expect(schedules.update).not.toHaveBeenCalled();
  });
  it("recovers a paid upgrade after DB failure without duplicate proration", async () => {
    await reconcile(13);
    store.write.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(reconcile(15, 2)).rejects.toThrow("database unavailable");
    await reconcile(15, 2);
    expect(state!.paidCapacity).toBe(15);
    expect(
      schedules.update.mock.calls.filter(
        (call) => call[1]!.proration_behavior === "always_invoice",
      ),
    ).toHaveLength(1);
  });
  it("will not treat an unpaid renewal, foreign schedule or mismatched paid invoice as capacity", async () => {
    sub.latest_invoice.status = "open";
    await expect(reconcile(13)).rejects.toThrow("billing_payment_pending");
    setup(14);
    sub.latest_invoice.lines.data[1]!.quantity = 11;
    await expect(reconcile(13)).rejects.toThrow("billing_paid_capacity_unverified");
    setup(14);
    sub.schedule = "sched_foreign";
    schedule = {
      id: "sched_foreign",
      metadata: {},
      status: "active",
      end_behavior: "release",
      phases: [],
    };
    await expect(reconcile(13)).rejects.toThrow("billing_foreign_schedule");
    expect(schedules.update).not.toHaveBeenCalled();
  });
  it("rejects foreign items instead of mutating them blindly", async () => {
    sub.items.data[1]!.price.id = "price_foreign";
    await expect(reconcile(13)).rejects.toThrow("payment_price_mismatch");
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
