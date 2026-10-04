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

/** Called under an organization lease. All quantities come from the DB outbox. */
export async function reconcileSubscription(
  stripe: Stripe,
  subscriptionId: string | null,
  propertyCount: number,
  revision: number,
  env: NodeJS.ProcessEnv,
) {
  if (!subscriptionId) return { subscription: null, action: "no_subscription" };
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  if (["canceled", "incomplete_expired"].includes(sub.status))
    return { subscription: sub, action: "inactive" };
  const quote = subscriptionQuote(propertyCount);
  if (quote.monthlyCents === 0) {
    // Stop future renewals immediately. Unused time is credited by Stripe; no cash refund is invented.
    const canceled = await stripe.subscriptions.cancel(
      sub.id,
      { prorate: true, invoice_now: false },
      { idempotencyKey: `hb-free-${sub.id}-${revision}` },
    );
    return { subscription: canceled, action: "free" };
  }
  const { base, extra } = await billingPrices(stripe, env);
  if (
    sub.items.has_more ||
    sub.items.data.some((item) => ![base.id, extra.id].includes(item.price.id)) ||
    sub.items.data.filter((item) => item.price.id === base.id).length !== 1 ||
    sub.items.data.filter((item) => item.price.id === extra.id).length > 1
  )
    throw new Error("payment_price_mismatch");
  const baseItem = sub.items.data.find((item) => item.price.id === base.id)!;
  const extraItem = sub.items.data.find((item) => item.price.id === extra.id);
  if (baseItem.quantity === 1 && (extraItem?.quantity ?? 0) === quote.extraQuantity)
    return { subscription: sub, action: "unchanged" };
  const updated = await stripe.subscriptions.update(
    sub.id,
    {
      items: [
        { id: baseItem.id, quantity: 1 },
        ...(extraItem
          ? [
              quote.extraQuantity
                ? { id: extraItem.id, quantity: quote.extraQuantity }
                : { id: extraItem.id, deleted: true },
            ]
          : quote.extraQuantity
            ? [{ price: extra.id, quantity: quote.extraQuantity }]
            : []),
      ],
      proration_behavior: "create_prorations",
      payment_behavior: "allow_incomplete",
      metadata: {
        ...sub.metadata,
        hostbuddy_property_count: String(propertyCount),
        hostbuddy_billing_revision: String(revision),
      },
    },
    { idempotencyKey: `hb-quantity-${sub.id}-${revision}-${propertyCount}` },
  );
  return { subscription: updated, action: "updated" };
}
