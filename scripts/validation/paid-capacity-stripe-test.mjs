/** Real Stripe TEST / Test Clocks. Creates only isolated fixtures, never HostBuddy rows.
 * Run with STRIPE_SECRET_KEY supplied by the secret runtime (never as a CLI argument).
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { createServer } from "vite";

const key = process.env.STRIPE_SECRET_KEY;
if (!key?.startsWith("sk_test_")) {
  console.error("NOT_RUN: a Stripe TEST runtime key is required; live keys are refused.");
  process.exit(2);
}
const stripe = new Stripe(key, { maxNetworkRetries: 2, timeout: 20000 });
const vite = await createServer({ configFile: false, server: { middlewareMode: true } });
const { reconcileSubscription } = await vite.ssrLoadModule("/src/lib/integrations/billing-sync.ts");
const marker = `hb-paid-capacity-${randomUUID()}`;
const products = [],
  priceIds = [],
  clocks = [];
const results = [];
const pause = () => new Promise((resolve) => setTimeout(resolve, 1000));
async function ready(clockId) {
  for (let attempt = 0; attempt < 180; attempt++) {
    const clock = await stripe.testHelpers.testClocks.retrieve(clockId);
    if (clock.status === "ready") return clock;
    if (clock.status === "internal_failure") throw Error("test_clock_failed");
    await pause();
  }
  throw Error("test_clock_timeout");
}
try {
  const env = {};
  for (const [name, amount] of [
    ["BASE", 999],
    ["EXTRA", 299],
  ]) {
    const product = await stripe.products.create({
      name: `${marker}-${name}`,
      metadata: { test_fixture: marker },
    });
    assert.equal(product.livemode, false);
    products.push(product.id);
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: amount,
      currency: "eur",
      recurring: { interval: "month" },
    });
    assert.equal(price.livemode, false);
    priceIds.push(price.id);
    env[`STRIPE_PRICE_${name}`] = price.id;
  }
  const items = (count) => [
    { price: env.STRIPE_PRICE_BASE, quantity: 1 },
    ...(count > 2 ? [{ price: env.STRIPE_PRICE_EXTRA, quantity: count - 2 }] : []),
  ];
  async function fixture(count) {
    const clock = await stripe.testHelpers.testClocks.create({
      frozen_time: Math.floor(Date.now() / 1000),
      name: marker,
    });
    clocks.push(clock.id);
    const customer = await stripe.customers.create({
      test_clock: clock.id,
      metadata: { test_fixture: marker },
    });
    assert.equal(customer.livemode, false);
    const method = await stripe.paymentMethods.attach("pm_card_visa", { customer: customer.id });
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: method.id },
    });
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: items(count),
      payment_behavior: "error_if_incomplete",
      metadata: { test_fixture: marker },
    });
    assert.equal(subscription.livemode, false);
    let state = null,
      revision = 0;
    const store = {
      guard: async () => {}, // Synthetic, isolated Stripe customer: no DB concurrency.
      read: async () => state && structuredClone(state),
      write: async (value) => {
        state = structuredClone(value);
      },
    };
    const start = subscription.items.data[0].current_period_start,
      end = subscription.items.data[0].current_period_end;
    await stripe.testHelpers.testClocks.advance(clock.id, {
      frozen_time: start + Math.floor((end - start) / 2),
    });
    await ready(clock.id);
    const invoices = async () =>
      (await stripe.invoices.list({ customer: customer.id, limit: 100 })).data;
    const reconcile = (count) =>
      reconcileSubscription(stripe, subscription.id, count, ++revision, env, store);
    const advance = async () => {
      await stripe.testHelpers.testClocks.advance(clock.id, { frozen_time: end + 7200 });
      await ready(clock.id);
      for (let attempt = 0; attempt < 90; attempt++) {
        const latest = await stripe.subscriptions.retrieve(subscription.id, {
          expand: ["latest_invoice"],
        });
        if (latest.status === "canceled" || latest.latest_invoice?.status === "paid") return latest;
        await pause();
      }
      throw Error("renewal_payment_timeout");
    };
    const noCredit = async () => {
      const current = await stripe.customers.retrieve(customer.id);
      assert.equal(current.balance, 0, "unexpected customer credit");
      for (const invoice of await invoices()) {
        assert.equal(invoice.livemode, false);
        assert.ok(invoice.total >= 0, "negative invoice");
      }
      assert.equal(
        (await stripe.invoiceItems.list({ customer: customer.id, pending: true, limit: 100 })).data
          .length,
        0,
        "pending credit or invoice item",
      );
    };
    return {
      customer,
      subscription,
      store,
      reconcile,
      invoices,
      advance,
      noCredit,
      state: () => state,
      end,
    };
  }
  const scenarios = [
    [
      "14 → 13",
      14,
      async (f) => {
        await f.reconcile(13);
        assert.equal((await f.invoices()).length, 1);
        assert.equal(f.state().renewalQuantity, 13);
        assert.equal(f.state().paidCapacity, 14);
      },
    ],
    [
      "14 → 13 → 14",
      14,
      async (f) => {
        await f.reconcile(13);
        await f.reconcile(14);
        assert.equal((await f.invoices()).length, 1);
      },
    ],
    [
      "14 → 13 → 15",
      14,
      async (f) => {
        await f.reconcile(13);
        await f.reconcile(15);
        const all = await f.invoices();
        assert.equal(all.length, 2);
        const upgrade = all.find((invoice) => invoice.billing_reason === "subscription_update");
        assert.equal(upgrade.status, "paid");
        assert.ok(Math.abs(upgrade.amount_paid - 150) <= 1, "only one extra at half-month prorata");
        assert.equal(f.state().paidCapacity, 15);
      },
    ],
    [
      "14 → 13 → renewal → 14",
      14,
      async (f) => {
        await f.reconcile(13);
        const renewed = await f.advance();
        assert.equal(
          renewed.items.data.find((item) => item.price.id === env.STRIPE_PRICE_EXTRA).quantity,
          11,
        );
        assert.equal(renewed.latest_invoice.amount_paid, 999 + 11 * 299);
        await f.reconcile(14);
        const all = await f.invoices();
        assert.equal(all.length, 3);
        const upgrade = all.find((invoice) => invoice.billing_reason === "subscription_update");
        const start = renewed.items.data[0].current_period_start,
          end = renewed.items.data[0].current_period_end;
        const current = await stripe.testHelpers.testClocks.retrieve(f.customer.test_clock);
        const expected = Math.round((299 * (end - current.frozen_time)) / (end - start));
        assert.ok(
          Math.abs(upgrade.amount_paid - expected) <= 1,
          "one additional property in new period",
        );
      },
    ],
    [
      "2 → 1",
      2,
      async (f) => {
        await f.reconcile(1);
        assert.equal((await f.invoices()).length, 1);
        assert.equal((await stripe.subscriptions.retrieve(f.subscription.id)).status, "active");
        assert.equal((await f.advance()).status, "canceled");
        assert.equal((await f.invoices()).length, 1);
      },
    ],
    [
      "2 → 1 → 2",
      2,
      async (f) => {
        await f.reconcile(1);
        await f.reconcile(2);
        assert.equal((await f.invoices()).length, 1);
        assert.equal((await f.advance()).latest_invoice.amount_paid, 999);
      },
    ],
    [
      "effective Free → 2",
      2,
      async (f) => {
        await f.reconcile(1);
        assert.equal((await f.advance()).status, "canceled");
        const fresh = await stripe.subscriptions.create({
          customer: f.customer.id,
          items: items(2),
          payment_behavior: "error_if_incomplete",
          expand: ["latest_invoice"],
          metadata: { test_fixture: marker },
        });
        assert.equal(fresh.livemode, false);
        assert.equal(fresh.latest_invoice.amount_paid, 999);
      },
    ],
  ];
  for (const [name, count, run] of scenarios) {
    const f = await fixture(count);
    await run(f);
    await f.noCredit();
    results.push({ scenario: name, status: "PASS", subscription: f.subscription.id });
    console.log(JSON.stringify(results.at(-1)));
  }
  console.log(
    JSON.stringify({
      mode: "Stripe TEST network",
      status: "PASS",
      scenarios: results.length,
      archiveDeletion:
        "Same authoritative count verified separately in synthetic PostgreSQL; no HostBuddy TEST data mutated.",
    }),
  );
} finally {
  // Delete only clocks created by THIS run; never existing Stripe/HostBuddy fixtures.
  for (const clock of clocks) {
    try {
      await ready(clock);
      await stripe.testHelpers.testClocks.del(clock);
    } catch {
      console.error(`test_fixture_cleanup_pending:${clock}`);
    }
  }
  for (const price of priceIds) await stripe.prices.update(price, { active: false });
  for (const product of products) await stripe.products.update(product, { active: false });
  await vite.close();
}
