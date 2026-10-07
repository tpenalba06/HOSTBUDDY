import type Stripe from "stripe";
import { HOSTBUDDY_PLAN, subscriptionQuote } from "./payment-policy";

export async function reconcileBillingCheckouts(
  stripe: Stripe,
  customer: string,
  org: string,
  propertyCount: number,
) {
  const sessions = await stripe.checkout.sessions.list({ customer, status: "open", limit: 100 });
  if (sessions.has_more) throw new Error("billing_checkout_overflow");
  let retained: Stripe.Checkout.Session | null = null;
  for (const session of sessions.data) {
    if (session.mode !== "subscription" || session.metadata?.["organization_id"] !== org) continue;
    if (
      propertyCount > 1 &&
      session.metadata["property_count"] === String(propertyCount) &&
      !retained
    )
      retained = session;
    else await stripe.checkout.sessions.expire(session.id);
  }
  return retained;
}

export async function billingPrices(stripe: Stripe, env: NodeJS.ProcessEnv) {
  const base = await stripe.prices.retrieve(env["STRIPE_PRICE_BASE"]!);
  const extra = await stripe.prices.retrieve(env["STRIPE_PRICE_EXTRA"]!);
  if (
    base.unit_amount !== HOSTBUDDY_PLAN.baseCents ||
    extra.unit_amount !== HOSTBUDDY_PLAN.extraCents ||
    [base, extra].some(
      (p) =>
        !p.active ||
        p.currency !== "eur" ||
        p.recurring?.interval !== "month" ||
        p.recurring.interval_count !== 1 ||
        p.recurring.usage_type !== "licensed" ||
        p.billing_scheme !== "per_unit" ||
        p.transform_quantity ||
        p.custom_unit_amount,
    )
  )
    throw new Error("payment_price_mismatch");
  return { base, extra };
}

export type BillingCapacity = {
  subscriptionId: string;
  periodStart: number;
  periodEnd: number;
  paidCapacity: number;
  renewalQuantity: number;
  scheduleId: string | null;
  invoiceId: string;
};
export type CapacityStore = {
  guard: () => Promise<void>;
  read: () => Promise<BillingCapacity | null>;
  write: (state: BillingCapacity) => Promise<void>;
};
const id = (value: string | { id: string }) => (typeof value === "string" ? value : value.id);

/** Stripe's current phase is a paid high-water mark; the next phase is actual inventory.
 * DB persistence is mandatory: an unpaid upgrade or a retry must not become paid capacity.
 */
export async function reconcileSubscription(
  stripe: Stripe,
  subscriptionId: string | null,
  propertyCount: number,
  revision: number,
  env: NodeJS.ProcessEnv,
  store: CapacityStore,
) {
  subscriptionQuote(propertyCount); // Reject invalid inventory before any mutation.
  if (!subscriptionId) return { subscription: null, action: "no_subscription" };
  let sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["latest_invoice"] });
  if (["canceled", "incomplete_expired"].includes(sub.status))
    return { subscription: sub, action: "inactive" };
  const { base, extra } = await billingPrices(stripe, env);
  const countFor = (value: Stripe.Subscription) => {
    const items = value.items.data;
    if (
      value.items.has_more ||
      items.some((item) => ![base.id, extra.id].includes(item.price.id)) ||
      items.filter((item) => item.price.id === base.id).length !== 1 ||
      items.filter((item) => item.price.id === extra.id).length > 1 ||
      items.find((item) => item.price.id === base.id)?.quantity !== 1
    )
      throw new Error("payment_price_mismatch");
    return 2 + (items.find((item) => item.price.id === extra.id)?.quantity ?? 0);
  };
  const invoiceFor = async (value: Stripe.Subscription) => {
    if (!value.latest_invoice) throw new Error("billing_paid_capacity_unverified");
    const invoice =
      typeof value.latest_invoice === "string"
        ? await stripe.invoices.retrieve(value.latest_invoice)
        : value.latest_invoice;
    const parent = invoice.parent?.subscription_details?.subscription;
    if (
      invoice.status !== "paid" ||
      !parent ||
      id(parent) !== value.id ||
      !["subscription_create", "subscription_cycle", "subscription_update"].includes(
        invoice.billing_reason ?? "",
      )
    )
      throw new Error("billing_payment_pending");
    return invoice;
  };
  const currentCount = countFor(sub);
  const periodStart = sub.items.data[0]!.current_period_start;
  const periodEnd = sub.items.data[0]!.current_period_end;
  if (
    !periodStart ||
    !periodEnd ||
    sub.items.data.some(
      (item) => item.current_period_start !== periodStart || item.current_period_end !== periodEnd,
    )
  )
    throw new Error("billing_period_mismatch");
  const phasesFor = (
    schedule: Stripe.SubscriptionSchedule,
    capacity: number,
  ): Stripe.SubscriptionScheduleUpdateParams.Phase[] => {
    const itemsFor = (count: number) => [
      { price: base.id, quantity: 1 },
      ...(count > 2 ? [{ price: extra.id, quantity: count - 2 }] : []),
    ];
    const currentPhase = schedule.phases.find(
      (phase) => phase.start_date <= periodStart && phase.end_date > periodStart,
    );
    if (!currentPhase || schedule.status !== "active") throw new Error("billing_schedule_mismatch");
    // Refuse unsupported legacy financial configurations instead of silently dropping them.
    if (
      currentPhase.discounts?.length ||
      currentPhase.items.some((item) => item.discounts?.length || item.tax_rates?.length) ||
      currentPhase.default_tax_rates?.length ||
      currentPhase.add_invoice_items?.length ||
      currentPhase.trial_end ||
      currentPhase.application_fee_percent ||
      currentPhase.transfer_data
    )
      throw new Error("billing_schedule_configuration_unsupported");
    const common = {
      proration_behavior: "none" as const,
      ...(currentPhase.automatic_tax
        ? { automatic_tax: { enabled: currentPhase.automatic_tax.enabled } }
        : {}),
    };
    return [
      {
        ...common,
        start_date: currentPhase.start_date,
        end_date: periodEnd,
        items: itemsFor(capacity),
      },
      ...(propertyCount > 1
        ? [
            {
              ...common,
              start_date: periodEnd,
              duration: { interval: "month" as const, interval_count: 1 },
              items: itemsFor(propertyCount),
            },
          ]
        : []),
    ];
  };
  let state = await store.read();
  let invoice: Stripe.Invoice;
  try {
    invoice = await invoiceFor(sub);
  } catch (cause) {
    // A failed upgrade must not freeze an obsolete renewal quantity. Adjust only the
    // future phase, leaving the unpaid current quantity/invoice and paid DB ceiling intact.
    if (
      cause instanceof Error &&
      cause.message === "billing_payment_pending" &&
      state &&
      sub.schedule
    ) {
      const pendingSchedule = await stripe.subscriptionSchedules.retrieve(id(sub.schedule));
      if (
        pendingSchedule.id !== state.scheduleId ||
        pendingSchedule.metadata?.["hostbuddy_policy"] !== "paid-capacity-v1"
      )
        throw cause;
      if (pendingSchedule.metadata["hostbuddy_renewal_quantity"] !== String(propertyCount)) {
        await store.guard();
        await stripe.subscriptionSchedules.update(
          pendingSchedule.id,
          {
            end_behavior: propertyCount <= 1 ? "cancel" : "release",
            proration_behavior: "none",
            metadata: {
              ...pendingSchedule.metadata,
              hostbuddy_renewal_quantity: String(propertyCount),
            },
            phases: phasesFor(pendingSchedule, currentCount),
          },
          {
            idempotencyKey: `hb-capacity-pending-${sub.id}-${periodStart}-${revision}-${propertyCount}`,
          },
        );
        await store.write({ ...state, renewalQuantity: propertyCount });
      }
    }
    throw cause;
  }
  if (!state || state.subscriptionId !== sub.id || state.periodStart !== periodStart) {
    // Bootstrap/reset only from a paid cycle/create invoice, never from an arbitrary property count.
    if (!["subscription_create", "subscription_cycle"].includes(invoice.billing_reason ?? ""))
      throw new Error("billing_paid_capacity_unverified");
    const lines = invoice.lines;
    const recurring = lines.data.filter(
      (line) =>
        line.period.start === periodStart &&
        line.period.end === periodEnd &&
        !line.parent?.subscription_item_details?.proration,
    );
    const invoiceBase = recurring.filter((line) => line.pricing?.price_details?.price === base.id);
    const invoiceExtras = recurring.filter(
      (line) => line.pricing?.price_details?.price === extra.id,
    );
    const invoicedCapacity = 2 + (invoiceExtras[0]?.quantity ?? 0);
    if (
      lines.has_more ||
      invoiceBase.length !== 1 ||
      invoiceBase[0]?.quantity !== 1 ||
      invoiceExtras.length > 1 ||
      invoicedCapacity !== currentCount
    )
      throw new Error("billing_paid_capacity_unverified");
    state = {
      subscriptionId: sub.id,
      periodStart,
      periodEnd,
      paidCapacity: invoicedCapacity,
      renewalQuantity: currentCount,
      scheduleId: null,
      invoiceId: invoice.id,
    };
    await store.write(state);
  } else {
    if (state.periodEnd !== periodEnd || currentCount < state.paidCapacity)
      throw new Error("billing_capacity_mismatch");
    if (currentCount > state.paidCapacity) {
      // Recover a successfully paid upgrade after a DB/network crash, but never a failed payment.
      if (invoice.id === state.invoiceId || invoice.billing_reason !== "subscription_update")
        throw new Error("billing_paid_capacity_unverified");
      state = { ...state, paidCapacity: currentCount, invoiceId: invoice.id };
      await store.write(state);
    }
  }
  const capacity = Math.max(state.paidCapacity, propertyCount);
  let schedule: Stripe.SubscriptionSchedule;
  if (sub.schedule) {
    schedule = await stripe.subscriptionSchedules.retrieve(id(sub.schedule));
    if (
      schedule.metadata?.["hostbuddy_policy"] !== "paid-capacity-v1" &&
      schedule.id !== state.scheduleId
    )
      throw new Error("billing_foreign_schedule");
  } else {
    if (sub.cancel_at_period_end || sub.cancel_at) throw new Error("billing_customer_cancellation");
    await store.guard();
    schedule = await stripe.subscriptionSchedules.create(
      { from_subscription: sub.id },
      { idempotencyKey: `hb-capacity-schedule-${sub.id}-${periodStart}` },
    );
    // Persist adoption before updating phases, so a crash is safely retryable.
    state = { ...state, scheduleId: schedule.id };
    await store.write(state);
  }
  const next = schedule.phases.find((phase) => phase.start_date === periodEnd);
  const nextCount = next
    ? 2 + (next.items.find((item) => id(item.price) === extra.id)?.quantity ?? 0)
    : 0;
  if (
    capacity === currentCount &&
    state.renewalQuantity === propertyCount &&
    schedule.metadata?.["hostbuddy_policy"] === "paid-capacity-v1" &&
    (propertyCount <= 1
      ? schedule.end_behavior === "cancel" && !next
      : schedule.end_behavior === "release" && nextCount === propertyCount)
  )
    return { subscription: sub, action: "unchanged" };
  await store.guard();
  await stripe.subscriptionSchedules.update(
    schedule.id,
    {
      end_behavior: propertyCount <= 1 ? "cancel" : "release",
      proration_behavior: capacity > state.paidCapacity ? "always_invoice" : "none",
      metadata: {
        ...schedule.metadata,
        hostbuddy_policy: "paid-capacity-v1",
        organization_id: sub.metadata["organization_id"] ?? "",
        hostbuddy_renewal_quantity: String(propertyCount),
      },
      phases: phasesFor(schedule, capacity),
    },
    {
      idempotencyKey: `hb-capacity-${sub.id}-${periodStart}-${revision}-${capacity}-${propertyCount}`,
    },
  );
  if (capacity > state.paidCapacity) {
    sub = await stripe.subscriptions.retrieve(sub.id, { expand: ["latest_invoice"] });
    const paidInvoice = await invoiceFor(sub);
    if (paidInvoice.id === state.invoiceId || countFor(sub) !== capacity)
      throw new Error("billing_paid_capacity_unverified");
    state = { ...state, paidCapacity: capacity, invoiceId: paidInvoice.id };
  }
  await store.write({ ...state, scheduleId: schedule.id, renewalQuantity: propertyCount });
  return { subscription: sub, action: capacity > currentCount ? "upgraded" : "scheduled" };
}
