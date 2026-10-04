import Stripe from "stripe";
import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { cents, paymentEnvironment, subscriptionQuote } from "./payment-policy";

type Account = {
  organization_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string;
  current_period_end: string | null;
  stripe_account_id: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  last_event_created: number;
  updated_at: string;
};
type Payment = {
  id: string;
  organization_id: string;
  order_id: string;
  stripe_account_id: string;
  checkout_session_id: string | null;
  payment_intent_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
};
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
type PaymentDatabase = Database & {
  public: {
    Tables: { organization_payment_accounts: Table<Account>; order_payments: Table<Payment> };
    Functions: {
      apply_stripe_event: {
        Args: { _event: string; _account: string | null; _created: number; _change: Json };
        Returns: boolean;
      };
    };
  };
};
export const paymentDb = supabaseAdmin as unknown as SupabaseClient<PaymentDatabase>;
const required = <T>(data: T): NonNullable<T> => {
  if (data == null) throw new Error("payment_unavailable");
  return data as NonNullable<T>;
};
const checked = <T>(value: { data: T; error: unknown }): T => {
  if (value.error) throw new Error("payment_unavailable");
  return value.data;
};
export function stripeClient() {
  if (!paymentEnvironment(process.env).enabled) throw new Error("payment_not_configured");
  return new Stripe(process.env["STRIPE_SECRET_KEY"]!, { maxNetworkRetries: 2, timeout: 20_000 });
}
export function appOrigin() {
  const url = new URL(process.env["HOSTBUDDY_APP_URL"] ?? "");
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error("payment_not_configured");
  return url.origin;
}
export async function requireOwner(org: string, user: string) {
  const row = checked(
    await paymentDb
      .from("organization_members")
      .select("role")
      .eq("organization_id", org)
      .eq("user_id", user)
      .maybeSingle(),
  );
  if (row?.role !== "owner") throw new Error("not_allowed");
}
async function account(org: string) {
  checked(
    await paymentDb
      .from("organization_payment_accounts")
      .upsert({ organization_id: org }, { onConflict: "organization_id", ignoreDuplicates: true }),
  );
  return required(
    checked(
      await paymentDb
        .from("organization_payment_accounts")
        .select("*")
        .eq("organization_id", org)
        .single(),
    ),
  );
}
export async function paymentOverview(org: string) {
  const config = paymentEnvironment(process.env);
  if (!config.enabled) return { config, account: null, payments: [], confirmedOrders: [] };
  const current = await account(org);
  if (current.stripe_account_id) {
    const connected = await stripeClient().v2.core.accounts.retrieve(current.stripe_account_id, {
      include: ["configuration.merchant", "configuration.recipient"],
    });
    const charges =
      connected.configuration?.merchant?.capabilities?.card_payments?.status === "active";
    const payouts =
      connected.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status ===
      "active";
    checked(
      await paymentDb
        .from("organization_payment_accounts")
        .update({ charges_enabled: charges, payouts_enabled: payouts })
        .eq("organization_id", org),
    );
    current.charges_enabled = charges;
    current.payouts_enabled = payouts;
  }
  const payments = required(
    checked(
      await paymentDb
        .from("order_payments")
        .select("id,order_id,amount_cents,currency,status,created_at")
        .eq("organization_id", org)
        .order("created_at", { ascending: false })
        .limit(100),
    ),
  );
  const orders = required(
    checked(
      await paymentDb
        .from("orders")
        .select("id,total_amount,services(name)")
        .eq("organization_id", org)
        .eq("status", "confirmed")
        .gt("total_amount", 0)
        .limit(100),
    ),
  );
  return { config, account: current, payments, confirmedOrders: orders };
}
export async function startBilling(org: string) {
  if (!paymentEnvironment(process.env).billing) throw new Error("payment_not_configured");
  const stripe = stripeClient();
  const current = await account(org);
  if (
    current.stripe_subscription_id &&
    !["canceled", "incomplete_expired"].includes(current.subscription_status)
  )
    return startPortal(org);
  if (!current.stripe_customer_id) {
    const customer = await stripe.customers.create(
      { metadata: { organization_id: org } },
      { idempotencyKey: `hb-customer-${org}` },
    );
    checked(
      await paymentDb
        .from("organization_payment_accounts")
        .update({ stripe_customer_id: customer.id })
        .eq("organization_id", org),
    );
    current.stripe_customer_id = customer.id;
  }
  const { count, error } = await paymentDb
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org)
    .neq("status", "archived");
  if (error) throw new Error("payment_unavailable");
  const { extraQuantity } = subscriptionQuote(count ?? 0);
  // Price IDs and quantities are selected exclusively by the server.
  const base = await stripe.prices.retrieve(process.env["STRIPE_PRICE_BASE"]!);
  const extra = await stripe.prices.retrieve(process.env["STRIPE_PRICE_EXTRA"]!);
  if (
    base.unit_amount !== 999 ||
    extra.unit_amount !== 299 ||
    [base, extra].some(
      (p) =>
        p.currency !== "eur" ||
        p.recurring?.interval !== "month" ||
        p.recurring.interval_count !== 1,
    )
  )
    throw new Error("payment_price_mismatch");
  const line_items = [
    { price: base.id, quantity: 1 },
    ...(extraQuantity ? [{ price: extra.id, quantity: extraQuantity }] : []),
  ];
  const session = await stripe.checkout.sessions.create(
    {
      customer: current.stripe_customer_id,
      mode: "subscription",
      line_items,
      subscription_data: { metadata: { organization_id: org } },
      success_url: `${appOrigin()}/app/payments`,
      cancel_url: `${appOrigin()}/app/payments`,
    },
    { idempotencyKey: `hb-billing-${org}-${extraQuantity}-${Math.floor(Date.now() / 300_000)}` },
  );
  return { url: session.url! };
}
export async function startPortal(org: string) {
  const current = await account(org);
  if (!current.stripe_customer_id) throw new Error("payment_not_configured");
  const portal = await stripeClient().billingPortal.sessions.create({
    customer: current.stripe_customer_id,
    return_url: `${appOrigin()}/app/payments`,
  });
  return { url: portal.url };
}
export async function connectOnboarding(org: string) {
  if (!paymentEnvironment(process.env).connect) throw new Error("payment_not_configured");
  const current = await account(org);
  const stripe = stripeClient();
  if (!current.stripe_account_id) {
    // Modern Accounts v2 SaaS model. Stripe handles KYC, processing fees and
    // connected-account losses. No invented HostBuddy transaction commission.
    const connected = await stripe.v2.core.accounts.create(
      {
        dashboard: "full",
        defaults: { responsibilities: { fees_collector: "stripe", losses_collector: "stripe" } },
        configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
        metadata: { organization_id: org },
      },
      { idempotencyKey: `hb-connect-${org}` },
    );
    checked(
      await paymentDb
        .from("organization_payment_accounts")
        .update({ stripe_account_id: connected.id })
        .eq("organization_id", org),
    );
    current.stripe_account_id = connected.id;
  }
  const link = await stripe.v2.core.accountLinks.create({
    account: current.stripe_account_id,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        refresh_url: `${appOrigin()}/app/payments`,
        return_url: `${appOrigin()}/app/payments`,
      },
    },
  });
  return { url: link.url };
}
export async function createOrderPaymentLink(org: string, orderId: string) {
  if (!paymentEnvironment(process.env).connect) throw new Error("payment_not_configured");
  const current = await account(org);
  if (!current.stripe_account_id || !current.charges_enabled)
    throw new Error("payment_not_configured");
  const order = required(
    checked(
      await paymentDb
        .from("orders")
        .select("id,total_amount,status")
        .eq("id", orderId)
        .eq("organization_id", org)
        .single(),
    ),
  );
  if (order.status !== "confirmed") throw new Error("order_not_confirmed");
  const existing = checked(
    await paymentDb
      .from("order_payments")
      .select("id,status")
      .eq("order_id", orderId)
      .maybeSingle(),
  );
  if (existing && existing.status !== "pending") throw new Error("payment_link_exists");
  const token = randomBytes(32).toString("hex");
  if (existing) {
    checked(
      await paymentDb
        .from("order_payments")
        .update({
          token_hash: createHash("sha256").update(token).digest("hex"),
          expires_at: new Date(Date.now() + 48 * 3600_000).toISOString(),
        })
        .eq("id", existing.id)
        .eq("organization_id", org),
    );
  } else {
    checked(
      await paymentDb.from("order_payments").insert({
        organization_id: org,
        order_id: orderId,
        stripe_account_id: current.stripe_account_id,
        amount_cents: cents(order.total_amount),
        token_hash: createHash("sha256").update(token).digest("hex"),
      }),
    );
  }
  return { url: `${appOrigin()}/pay/${token}` };
}
export async function paymentSummary(token: string) {
  const payment = checked(
    await paymentDb
      .from("order_payments")
      .select("order_id,amount_cents,currency,status,expires_at")
      .eq("token_hash", createHash("sha256").update(token).digest("hex"))
      .maybeSingle(),
  );
  if (!payment || Date.parse(payment.expires_at) < Date.now())
    throw new Error("payment_link_unavailable");
  const order = required(
    checked(
      await paymentDb
        .from("orders")
        .select("status,services(name)")
        .eq("id", payment.order_id)
        .single(),
    ),
  );
  return {
    amountCents: payment.amount_cents,
    currency: payment.currency,
    status: payment.status,
    name: order.services?.name ?? "",
    canPay: order.status === "confirmed" && payment.status === "pending",
  };
}
export async function checkoutForToken(token: string) {
  const payment = checked(
    await paymentDb
      .from("order_payments")
      .select("*")
      .eq("token_hash", createHash("sha256").update(token).digest("hex"))
      .maybeSingle(),
  );
  if (
    !payment ||
    Date.parse(payment.expires_at) < Date.now() ||
    payment.status === "paid" ||
    payment.status === "refunded"
  )
    throw new Error("payment_link_unavailable");
  const order = required(
    checked(
      await paymentDb
        .from("orders")
        .select("status,services(name)")
        .eq("id", payment.order_id)
        .eq("organization_id", payment.organization_id)
        .single(),
    ),
  );
  if (order.status !== "confirmed") throw new Error("order_not_confirmed");
  const stripe = stripeClient();
  const connected = await stripe.v2.core.accounts.retrieve(payment.stripe_account_id, {
    include: ["configuration.merchant"],
  });
  if (connected.configuration?.merchant?.capabilities?.card_payments?.status !== "active")
    throw new Error("payment_not_configured");
  const session = payment.checkout_session_id
    ? await stripe.checkout.sessions.retrieve(
        payment.checkout_session_id,
        {},
        { stripeAccount: payment.stripe_account_id },
      )
    : await stripe.checkout.sessions.create(
        {
          mode: "payment",
          line_items: [
            {
              price_data: {
                currency: payment.currency,
                unit_amount: payment.amount_cents,
                product_data: { name: order.services?.name ?? "Service" },
              },
              quantity: 1,
            },
          ],
          metadata: { payment_id: payment.id },
          payment_intent_data: { metadata: { payment_id: payment.id } },
          success_url: `${appOrigin()}/pay/${token}`,
          cancel_url: `${appOrigin()}/pay/${token}`,
        },
        { stripeAccount: payment.stripe_account_id, idempotencyKey: `hb-service-${payment.id}` },
      );
  checked(
    await paymentDb
      .from("order_payments")
      .update({ checkout_session_id: session.id })
      .eq("id", payment.id),
  );
  if (!session.url || session.status !== "open") throw new Error("payment_link_unavailable");
  return { url: session.url };
}
export async function refundOrderPayment(org: string, id: string) {
  const payment = required(
    checked(
      await paymentDb
        .from("order_payments")
        .select("*")
        .eq("organization_id", org)
        .eq("id", id)
        .single(),
    ),
  );
  if (payment.status !== "paid" || !payment.payment_intent_id) throw new Error("payment_not_paid");
  await stripeClient().refunds.create(
    { payment_intent: payment.payment_intent_id },
    { stripeAccount: payment.stripe_account_id, idempotencyKey: `hb-refund-${payment.id}` },
  );
  return { ok: true }; // Refund status is updated only by the signed webhook.
}
export async function handleStripeEvent(event: Stripe.Event) {
  const stripe = stripeClient();
  let change: Json = {};
  if (
    event.type.startsWith("customer.subscription.") ||
    event.type.startsWith("invoice.payment_")
  ) {
    const object = event.data.object;
    const subId =
      "object" in object && object.object === "subscription"
        ? object.id
        : "parent" in object
          ? object.parent?.subscription_details?.subscription
          : null;
    if (subId && typeof subId === "string") {
      const sub = await stripe.subscriptions.retrieve(subId);
      const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const end = sub.items.data[0]?.current_period_end;
      change = {
        kind: "subscription",
        subscription: sub.id,
        customer,
        status: sub.status,
        period_end: end ? new Date(end * 1000).toISOString() : null,
      };
    }
  } else if (event.type.startsWith("checkout.session.")) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode === "subscription" && typeof session.subscription === "string") {
      const sub = await stripe.subscriptions.retrieve(session.subscription);
      const end = sub.items.data[0]?.current_period_end;
      change = {
        kind: "subscription",
        subscription: sub.id,
        customer: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        status: sub.status,
        period_end: end ? new Date(end * 1000).toISOString() : null,
      };
    } else if (event.account) {
      const status =
        session.payment_status === "paid"
          ? "paid"
          : event.type === "checkout.session.expired"
            ? "expired"
            : event.type === "checkout.session.async_payment_failed"
              ? "failed"
              : "pending";
      change = {
        kind: "payment",
        session: session.id,
        intent: typeof session.payment_intent === "string" ? session.payment_intent : null,
        status,
        amount: session.amount_total,
        currency: session.currency,
      };
    }
  } else if (event.type === "charge.refunded" && event.account) {
    const charge = event.data.object as Stripe.Charge;
    change = {
      kind: "payment",
      intent: typeof charge.payment_intent === "string" ? charge.payment_intent : null,
      status: charge.refunded ? "refunded" : "partially_refunded",
    };
  }
  checked(
    await paymentDb.rpc("apply_stripe_event", {
      _event: event.id,
      _account: event.account ?? null,
      _created: event.created,
      _change: change,
    }),
  );
}
