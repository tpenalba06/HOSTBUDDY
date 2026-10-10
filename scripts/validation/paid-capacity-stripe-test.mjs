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
const safeError = (error) => ({
  name: error?.name,
  code: error?.code,
  message: String(error?.message ?? error)
    .replace(/(?:sk|rk|pk)_(?:test|live)_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+/g, "REDACTED")
    .slice(0, 500),
});
const invoiceView = (invoice) => ({
  id: invoice.id,
  status: invoice.status,
  billing_reason: invoice.billing_reason,
  amount_due: invoice.amount_due,
  amount_paid: invoice.amount_paid,
  total: invoice.total,
  currency: invoice.currency,
  livemode: invoice.livemode,
  auto_advance: invoice.auto_advance,
  next_payment_attempt: invoice.next_payment_attempt,
  finalized_at: invoice.status_transitions?.finalized_at,
  paid_at: invoice.status_transitions?.paid_at,
  last_finalization_error: invoice.last_finalization_error
    ? safeError(invoice.last_finalization_error)
    : null,
});
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
    const recoveries = [];
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
    const paidInvoice = async (invoiceId) => {
      let invoice = await stripe.invoices.retrieve(invoiceId);
      assert.equal(invoice.livemode, false);
      const initial = invoiceView(invoice);
      if (invoice.status === "draft" && invoice.auto_advance) {
        const current = await ready(clock.id);
        // Waiting in wall-clock time does not advance a Stripe Test Clock.
        // Cross the automatic finalization/payment deadline; never manually pay.
        const deadline = invoice.next_payment_attempt ?? current.frozen_time + 3600;
        await stripe.testHelpers.testClocks.advance(clock.id, {
          frozen_time: Math.max(current.frozen_time + 1, deadline + 60),
        });
        await ready(clock.id);
      }
      for (let attempt = 0; attempt < 60; attempt++) {
        invoice = await stripe.invoices.retrieve(invoiceId);
        assert.equal(invoice.livemode, false);
        if (invoice.status === "paid") {
          console.log(
            JSON.stringify({ stage: "invoice_paid", initial, final: invoiceView(invoice) }),
          );
          return invoice;
        }
        if (["void", "uncollectible"].includes(invoice.status)) break;
        await pause();
      }
      const payments = await stripe.invoicePayments.list({ invoice: invoiceId, limit: 100 });
      const paymentStates = [];
      for (const payment of payments.data) {
        const intentId = payment.payment?.payment_intent;
        const intent = intentId
          ? await stripe.paymentIntents.retrieve(
              typeof intentId === "string" ? intentId : intentId.id,
            )
          : null;
        if (intent) assert.equal(intent.livemode, false);
        paymentStates.push({
          id: payment.id,
          status: payment.status,
          paymentIntent: intent
            ? {
                id: intent.id,
                status: intent.status,
                last_payment_error: intent.last_payment_error
                  ? safeError(intent.last_payment_error)
                  : null,
              }
            : null,
        });
      }
      console.log(
        JSON.stringify({
          stage: "invoice_not_paid",
          initial,
          final: invoiceView(invoice),
          payments: paymentStates,
        }),
      );
      throw Error(`invoice_payment_timeout:${invoice.id}:${invoice.status}`);
    };
    const invokeReconcile = (count, requestRevision) =>
      reconcileSubscription(stripe, subscription.id, count, requestRevision, env, store);
    const retry = (count) => invokeReconcile(count, revision);
    const reconcile = async (count) => {
      const requestRevision = ++revision;
      try {
        return await invokeReconcile(count, requestRevision);
      } catch (error) {
        if (error?.message !== "billing_payment_pending" || !state || count <= state.paidCapacity)
          throw error;
        const unpaidCapacity = state.paidCapacity;
        const latest = await stripe.subscriptions.retrieve(subscription.id, {
          expand: ["latest_invoice"],
        });
        const invoice =
          typeof latest.latest_invoice === "string"
            ? await stripe.invoices.retrieve(latest.latest_invoice)
            : latest.latest_invoice;
        assert.ok(invoice, "upgrade invoice exists");
        assert.equal(invoice.billing_reason, "subscription_update");
        assert.notEqual(invoice.id, state.invoiceId, "new upgrade invoice");
        const parent = invoice.parent?.subscription_details?.subscription;
        assert.equal(typeof parent === "string" ? parent : parent?.id, subscription.id);
        await paidInvoice(invoice.id);
        assert.equal(
          state.paidCapacity,
          unpaidCapacity,
          "capacity is not granted before paid reconcile",
        );
        const beforeRetry = (await invoices()).map(invoiceView);
        // payments.server.ts enqueues a NEW billing revision for the payment event.
        // The paid recovery is a distinct operation from the unpaid upgrade:
        // always_invoice and none must not share the original operation's key.
        // Keep this recovery revision stable for retries of the same operation.
        const recoveryRevision = ++revision;
        const result = await invokeReconcile(count, recoveryRevision);
        const afterRetry = (await invoices()).map(invoiceView);
        assert.deepEqual(afterRetry, beforeRetry, "paid recovery must not charge twice");
        assert.equal(state.paidCapacity, count);
        assert.equal(state.renewalQuantity, count);
        await retry(count);
        assert.deepEqual(
          (await invoices()).map(invoiceView),
          beforeRetry,
          "stable recovery-revision retry must not charge twice",
        );
        const recovery = {
          stage: "paid_capacity_recovered",
          upgradeRevision: requestRevision,
          recoveryRevision,
          secondReconcileSucceeded: true,
          stableRetrySucceeded: true,
          paidCapacity: state.paidCapacity,
          renewalQuantity: state.renewalQuantity,
          invoice: invoice.id,
          invoicesBefore: beforeRetry.length,
          invoicesAfter: afterRetry.length,
          noSecondInvoice: true,
        };
        recoveries.push(recovery);
        console.log(JSON.stringify(recovery));
        return result;
      }
    };
    const advance = async () => {
      await stripe.testHelpers.testClocks.advance(clock.id, { frozen_time: end + 7200 });
      await ready(clock.id);
      for (let attempt = 0; attempt < 90; attempt++) {
        const latest = await stripe.subscriptions.retrieve(subscription.id, {
          expand: ["latest_invoice"],
        });
        if (latest.status === "canceled") return latest;
        if (
          latest.items.data[0].current_period_start >= end &&
          latest.latest_invoice?.billing_reason === "subscription_cycle"
        ) {
          await paidInvoice(latest.latest_invoice.id);
          return stripe.subscriptions.retrieve(subscription.id, { expand: ["latest_invoice"] });
        }
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
        assert.equal(
          (await stripe.creditNotes.list({ invoice: invoice.id, limit: 100 })).data.length,
          0,
          "unexpected credit note",
        );
      }
      for (const charge of (await stripe.charges.list({ customer: customer.id, limit: 100 }))
        .data) {
        assert.equal(charge.livemode, false);
        assert.equal(charge.amount_refunded, 0, "unexpected refund");
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
      retry,
      invoices,
      advance,
      noCredit,
      evidence: async () => {
        const current = await stripe.subscriptions.retrieve(subscription.id);
        const balance = await stripe.customers.retrieve(customer.id);
        const schedule = current.schedule
          ? await stripe.subscriptionSchedules.retrieve(
              typeof current.schedule === "string" ? current.schedule : current.schedule.id,
            )
          : null;
        const clockState = await stripe.testHelpers.testClocks.retrieve(clock.id);
        const allInvoices = (await invoices()).map(invoiceView);
        return {
          invoices: allInvoices,
          invoiceCount: allInvoices.length,
          prorationInvoiceCount: allInvoices.filter(
            (invoice) => invoice.billing_reason === "subscription_update",
          ).length,
          recoveries,
          customerBalance: balance.balance,
          subscriptionStatus: current.status,
          subscriptionQuantity: current.items.data.map((item) => ({
            price: item.price.id,
            quantity: item.quantity,
          })),
          capacity: state,
          schedule: schedule
            ? {
                id: schedule.id,
                status: schedule.status,
                end_behavior: schedule.end_behavior,
                phases: schedule.phases.map((phase) => ({
                  start: phase.start_date,
                  end: phase.end_date,
                  items: phase.items.map((item) => ({
                    price: typeof item.price === "string" ? item.price : item.price.id,
                    quantity: item.quantity,
                  })),
                })),
              }
            : null,
          clock: { id: clock.id, frozen_time: clockState.frozen_time, status: clockState.status },
        };
      },
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
        await f.noCredit();
        assert.equal((await f.advance()).latest_invoice.amount_paid, 999 + 11 * 299);
      },
    ],
    [
      "14 → 13 → 14",
      14,
      async (f) => {
        await f.reconcile(13);
        assert.equal(f.state().paidCapacity, 14);
        await f.noCredit();
        await f.reconcile(14);
        assert.equal((await f.invoices()).length, 1);
        assert.equal((await f.advance()).latest_invoice.amount_paid, 999 + 12 * 299);
      },
    ],
    [
      "14 → 13 → 15",
      14,
      async (f) => {
        await f.reconcile(13);
        assert.equal(f.state().paidCapacity, 14);
        await f.noCredit();
        await f.reconcile(15);
        const all = await f.invoices();
        assert.equal(all.length, 2);
        const upgrade = all.find((invoice) => invoice.billing_reason === "subscription_update");
        assert.equal(upgrade.status, "paid");
        assert.ok(Math.abs(upgrade.amount_paid - 150) <= 1, "only one extra at half-month prorata");
        assert.equal(f.state().paidCapacity, 15);
        await f.retry(15); // Same revision: no new invoice, even after successful recovery.
        assert.equal((await f.invoices()).length, 2);
        assert.equal((await f.advance()).latest_invoice.amount_paid, 999 + 13 * 299);
      },
    ],
    [
      "14 → 13 → renewal → 14",
      14,
      async (f) => {
        await f.reconcile(13);
        assert.equal(f.state().paidCapacity, 14);
        await f.noCredit();
        const renewed = await f.advance();
        assert.equal(
          renewed.items.data.find((item) => item.price.id === env.STRIPE_PRICE_EXTRA).quantity,
          11,
        );
        assert.equal(renewed.latest_invoice.amount_paid, 999 + 11 * 299);
        const creationClock = await stripe.testHelpers.testClocks.retrieve(f.customer.test_clock);
        await f.reconcile(14);
        const all = await f.invoices();
        assert.equal(all.length, 3);
        const upgrade = all.find((invoice) => invoice.billing_reason === "subscription_update");
        assert.equal(upgrade.status, "paid");
        assert.equal(f.state().paidCapacity, 14);
        const start = renewed.items.data[0].current_period_start,
          end = renewed.items.data[0].current_period_end;
        const expected = Math.round((299 * (end - creationClock.frozen_time)) / (end - start));
        assert.ok(
          Math.abs(upgrade.amount_paid - expected) <= 1,
          "one additional property in new period",
        );
        await f.retry(14);
        assert.equal((await f.invoices()).length, 3);
        assert.equal(f.state().renewalQuantity, 14);
      },
    ],
    [
      "2 → 1",
      2,
      async (f) => {
        await f.reconcile(1);
        assert.equal(f.state().paidCapacity, 2);
        await f.noCredit();
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
        assert.equal(f.state().paidCapacity, 2);
        await f.noCredit();
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
        assert.equal(f.state().paidCapacity, 2);
        await f.noCredit();
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
    let f;
    try {
      f = await fixture(count);
      await run(f);
      await f.noCredit();
      results.push({ scenario: name, status: "PASS", noCredit: true, ...(await f.evidence()) });
    } catch (error) {
      let evidence = {};
      try {
        if (f) evidence = await f.evidence();
      } catch (readError) {
        evidence = { evidenceError: safeError(readError) };
      }
      results.push({ scenario: name, status: "FAIL", error: safeError(error), ...evidence });
      process.exitCode = 1;
    }
    console.log(JSON.stringify(results.at(-1)));
    const result = results.at(-1);
    console.log(
      JSON.stringify({
        stage: "scenario_summary",
        scenario: name,
        status: result.status,
        error: result.error,
        noCredit: result.noCredit,
        noRefund: result.noCredit,
        customerBalance: result.customerBalance,
        paidCapacity: result.capacity?.paidCapacity,
        renewalQuantity: result.capacity?.renewalQuantity,
        invoiceCount: result.invoiceCount,
        prorationInvoiceCount: result.prorationInvoiceCount,
        invoices: result.invoices?.map((invoice) => ({
          id: invoice.id,
          status: invoice.status,
          reason: invoice.billing_reason,
          due: invoice.amount_due,
          paid: invoice.amount_paid,
          currency: invoice.currency,
          livemode: invoice.livemode,
        })),
        recoveries: result.recoveries,
      }),
    );
  }
  console.log(
    JSON.stringify({
      mode: "Stripe TEST network",
      status: results.every((result) => result.status === "PASS") ? "PASS" : "FAIL",
      scenarios: results.length,
      archiveDeletion:
        "Same authoritative count verified separately in synthetic PostgreSQL; no HostBuddy TEST data mutated.",
    }),
  );
} finally {
  // Delete only clocks created by THIS run; never existing Stripe/HostBuddy fixtures.
  let deletedClocks = 0;
  for (const clock of clocks) {
    try {
      await ready(clock);
      const deleted = await stripe.testHelpers.testClocks.del(clock);
      assert.equal(deleted.deleted, true);
      deletedClocks++;
      console.log(JSON.stringify({ cleanup: "clock_deleted", id: clock, deleted: true }));
    } catch {
      console.error(`test_fixture_cleanup_pending:${clock}`);
      process.exitCode = 1;
    }
  }
  for (const price of priceIds) {
    const value = await stripe.prices.update(price, { active: false });
    assert.equal(value.active, false);
    assert.equal(value.livemode, false);
    console.log(
      JSON.stringify({
        cleanup: "price",
        id: price,
        active: value.active,
        livemode: value.livemode,
      }),
    );
  }
  for (const product of products) {
    const value = await stripe.products.update(product, { active: false });
    assert.equal(value.active, false);
    assert.equal(value.livemode, false);
    console.log(
      JSON.stringify({
        cleanup: "product",
        id: product,
        active: value.active,
        livemode: value.livemode,
      }),
    );
  }
  console.log(
    JSON.stringify({
      stage: "cleanup_summary",
      status: deletedClocks === clocks.length ? "PASS" : "FAIL",
      clocksCreated: clocks.length,
      clocksDeleted: deletedClocks,
      pricesDeactivated: priceIds.length,
      productsDeactivated: products.length,
      hostbuddyDbFixturesCreated: 0,
    }),
  );
  await vite.close();
}
