import Stripe from "stripe";
import { paymentServerEnvironment } from "./payment-environment.server";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { cents, paymentEnvironment, subscriptionQuote, serviceFeeCents } from "./payment-policy";
import { billingPrices, reconcileSubscription, reconcileBillingCheckouts } from "./billing-sync";

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
  service_fee_terms_version: string | null;
  service_fee_terms_accepted_at: string | null;
};
type Payment = {
  id: string;
  organization_id: string;
  order_id: string;
  stripe_account_id: string;
  checkout_session_id: string | null;
  payment_intent_id: string | null;
  amount_cents: number;
  application_fee_cents: number;
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
    Tables: {
      organization_payment_accounts: Table<Account>;
      order_payments: Table<Payment>;
      organization_billing_sync: Table<{
        organization_id: string;
        revision: number;
        synced_revision: number;
        pending: boolean;
        updated_at: string;
        last_error: string | null;
      }>;
    };
    Functions: {
      enqueue_billing_sync: { Args: { _org: string }; Returns: undefined };
      claim_billing_sync: { Args: { _org: string; _lease: string }; Returns: Json };
      complete_billing_sync: {
        Args: { _org: string; _lease: string; _revision: number; _error: string | null };
        Returns: undefined;
      };
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
  const env = paymentServerEnvironment();
  if (!paymentEnvironment(env).enabled) throw new Error("payment_not_configured");
  return new Stripe(env["STRIPE_SECRET_KEY"]!, {
    maxNetworkRetries: 2,
    timeout: 20_000,
  });
}
export function appOrigin() {
  const url = new URL(paymentServerEnvironment()["HOSTBUDDY_APP_URL"] ?? "");
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
  const config = paymentEnvironment(paymentServerEnvironment());
  const propertyCount = await billablePropertyCount(org);
  const quote = { propertyCount, ...subscriptionQuote(propertyCount) };
  if (!config.enabled)
    return { config, quote, syncPending: false, account: null, payments: [], confirmedOrders: [] };
  const sync = await syncOrganizationBilling(org);
  const current = await account(org);
  if (current.stripe_account_id) {
    const connected = await stripeClient().v2.core.accounts.retrieve(current.stripe_account_id, {
      include: ["configuration.merchant"],
    });
    const charges =
      connected.configuration?.merchant?.capabilities?.card_payments?.status === "active";
    const payouts =
      connected.configuration?.merchant?.capabilities?.stripe_balance?.payouts?.status === "active";
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
        .select("id,order_id,amount_cents,application_fee_cents,currency,status,created_at")
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
  return {
    config,
    quote,
    syncPending: sync.pending,
    account: current,
    payments,
    confirmedOrders: orders,
  };
}
async function billablePropertyCount(org: string) {
  const { count, error } = await paymentDb
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org)
    .neq("status", "archived");
  if (error || count == null) throw new Error("payment_unavailable");
  return count;
}
export async function syncOrganizationBilling(org: string) {
  if (!paymentEnvironment(paymentServerEnvironment()).billing)
    return { pending: false, configured: false };
  for (let attempt = 0; attempt < 5; attempt++) {
    const lease = randomUUID();
    const job = checked(
      await paymentDb.rpc("claim_billing_sync", { _org: org, _lease: lease }),
    ) as { revision: number; propertyCount: number } | null;
    if (!job) break;
    try {
      const current = await account(org);
      if (current.stripe_customer_id)
        await reconcileBillingCheckouts(
          stripeClient(),
          current.stripe_customer_id,
          org,
          job.propertyCount,
        );
      await reconcileSubscription(
        stripeClient(),
        current.stripe_subscription_id,
        job.propertyCount,
        job.revision,
        paymentServerEnvironment(),
      );
      checked(
        await paymentDb.rpc("complete_billing_sync", {
          _org: org,
          _lease: lease,
          _revision: job.revision,
          _error: null,
        }),
      );
    } catch {
      checked(
        await paymentDb.rpc("complete_billing_sync", {
          _org: org,
          _lease: lease,
          _revision: job.revision,
          _error: "stripe_sync_failed",
        }),
      );
      return { pending: true, configured: true };
    }
  }
  const job = checked(
    await paymentDb
      .from("organization_billing_sync")
      .select("revision,synced_revision")
      .eq("organization_id", org)
      .maybeSingle(),
  );
  return { pending: !!job && job.synced_revision < job.revision, configured: true };
}
export async function syncPendingBilling() {
  if (!paymentEnvironment(paymentServerEnvironment()).billing)
    throw new Error("payment_not_configured");
  const jobs = checked(
    await paymentDb
      .from("organization_billing_sync")
      .select("organization_id,revision,synced_revision")
      .eq("pending", true)
      .order("updated_at")
      .limit(50),
  );
  let pending = 0;
  for (const job of jobs ?? [])
    if (job.synced_revision < job.revision)
      if ((await syncOrganizationBilling(job.organization_id)).pending) pending++;
  return { pending };
}
export async function startBilling(org: string) {
  const count = await billablePropertyCount(org);
  const { extraQuantity, monthlyCents } = subscriptionQuote(count);
  if (!monthlyCents) throw new Error("subscription_not_required");
  if (!paymentEnvironment(paymentServerEnvironment()).billing)
    throw new Error("payment_not_configured");
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
  // Price IDs and quantities are selected exclusively by the server.
  const { base, extra } = await billingPrices(stripe, paymentServerEnvironment());
  const open = await reconcileBillingCheckouts(stripe, current.stripe_customer_id!, org, count);
  if (open?.url) return { url: open.url };
  const line_items = [
    { price: base.id, quantity: 1 },
    ...(extraQuantity ? [{ price: extra.id, quantity: extraQuantity }] : []),
  ];
  const session = await stripe.checkout.sessions.create(
    {
      customer: current.stripe_customer_id,
      mode: "subscription",
      metadata: {
        organization_id: org,
        property_count: String(count),
        pricing_version: "free-plus-two-v2",
      },
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
  const stripe = stripeClient();
  // Quantities belong to HostBuddy's property counter, never a portal slider.
  const configuration = await stripe.billingPortal.configurations.create(
    {
      business_profile: { headline: "HostBuddy" },
      features: {
        customer_update: { enabled: true, allowed_updates: ["address", "name", "tax_id"] },
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true, mode: "at_period_end" },
        subscription_update: { enabled: false },
      },
    },
    { idempotencyKey: `hb-portal-v2-${Math.floor(Date.now() / 86400000)}` },
  );
  const portal = await stripe.billingPortal.sessions.create({
    configuration: configuration.id,
    customer: current.stripe_customer_id,
    return_url: `${appOrigin()}/app/payments`,
  });
  return { url: portal.url };
}
export async function connectOnboarding(org: string, feeTermsAccepted: boolean) {
  if (!paymentEnvironment(paymentServerEnvironment()).connect)
    throw new Error("payment_not_configured");
  if (!feeTermsAccepted) throw new Error("fee_terms_required");
  checked(
    await paymentDb
      .from("organization_payment_accounts")
      .upsert({ organization_id: org }, { onConflict: "organization_id", ignoreDuplicates: true }),
  );
  checked(
    await paymentDb
      .from("organization_payment_accounts")
      .update({
        service_fee_terms_version: "services-2pct-v1",
        service_fee_terms_accepted_at: new Date().toISOString(),
      })
      .eq("organization_id", org),
  );
  const current = await account(org);
  const stripe = stripeClient();
  if (!current.stripe_account_id) {
    // Modern Accounts v2 SaaS model. Stripe handles KYC, processing fees and
    // connected-account losses. HostBuddy charges its disclosed 2% separately.
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
  if (!paymentEnvironment(paymentServerEnvironment()).connect)
    throw new Error("payment_not_configured");
  const current = await account(org);
  if (!current.stripe_account_id || !current.charges_enabled)
    throw new Error("payment_not_configured");
  if (current.service_fee_terms_version !== "services-2pct-v1")
    throw new Error("fee_terms_required");
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
        application_fee_cents: serviceFeeCents(cents(order.total_amount)),
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
    canPay: order.status === "confirmed" && ["pending", "expired"].includes(payment.status),
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
    !["pending", "expired"].includes(payment.status)
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
  const previous = payment.checkout_session_id
    ? await stripe.checkout.sessions.retrieve(
        payment.checkout_session_id,
        {},
        { stripeAccount: payment.stripe_account_id },
      )
    : null;
  if (previous?.status === "complete") throw new Error("payment_link_unavailable");
  const session =
    previous?.status === "open"
      ? previous
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
            payment_intent_data: {
              metadata: { payment_id: payment.id },
              ...(payment.application_fee_cents
                ? { application_fee_amount: payment.application_fee_cents }
                : {}),
            },
            success_url: `${appOrigin()}/pay/${token}`,
            cancel_url: `${appOrigin()}/pay/${token}`,
          },
          {
            stripeAccount: payment.stripe_account_id,
            idempotencyKey: `hb-service-${payment.id}-${previous?.id ?? "initial"}`,
          },
        );
  checked(
    await paymentDb
      .from("order_payments")
      .update({ checkout_session_id: session.id })
      .eq("id", payment.id),
  );
  if (session.status === "open") {
    checked(
      await paymentDb
        .from("order_payments")
        .update({ status: "pending" })
        .eq("id", payment.id)
        .eq("status", "expired"),
    );
  }
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
    {
      payment_intent: payment.payment_intent_id,
      ...(payment.application_fee_cents ? { refund_application_fee: true } : {}),
    },
    { stripeAccount: payment.stripe_account_id, idempotencyKey: `hb-refund-${payment.id}` },
  );
  return { ok: true }; // Refund status is updated only by the signed webhook.
}
export async function handleStripeEvent(event: Stripe.Event) {
  const stripe = stripeClient();
  let change: Json = {};
  if (
    !event.account &&
    (event.type.startsWith("customer.subscription.") || event.type.startsWith("invoice.payment_"))
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
    if (
      !event.account &&
      session.mode === "subscription" &&
      typeof session.subscription === "string"
    ) {
      const sub = await stripe.subscriptions.retrieve(session.subscription);
      const end = sub.items.data[0]?.current_period_end;
      change = {
        kind: "subscription",
        subscription: sub.id,
        customer: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        status: sub.status,
        period_end: end ? new Date(end * 1000).toISOString() : null,
      };
    } else if (event.account && session.mode === "payment") {
      // Stripe may deliver a webhook before the Checkout creation request has
      // persisted its session ID. Bind only the first session, and only after
      // matching the signed event's account, amount and currency to our ledger.
      if (
        session.metadata?.["payment_id"] &&
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
          session.metadata["payment_id"],
        )
      ) {
        checked(
          await paymentDb
            .from("order_payments")
            .update({ checkout_session_id: session.id })
            .eq("id", session.metadata["payment_id"])
            .eq("stripe_account_id", event.account)
            .eq("amount_cents", session.amount_total ?? -1)
            .eq("currency", session.currency ?? "")
            .is("checkout_session_id", null),
        );
      }
      const status =
        session.payment_status === "paid"
          ? "paid"
          : event.type === "checkout.session.expired"
            ? "expired"
            : event.type === "checkout.session.async_payment_failed"
              ? "failed"
              : "pending";
      if (status === "paid" && typeof session.payment_intent === "string") {
        const ledger = checked(
          await paymentDb
            .from("order_payments")
            .select("application_fee_cents")
            .eq("checkout_session_id", session.id)
            .eq("stripe_account_id", event.account)
            .maybeSingle(),
        );
        if (ledger) {
          const intent = await stripe.paymentIntents.retrieve(
            session.payment_intent,
            {},
            { stripeAccount: event.account },
          );
          if ((intent.application_fee_amount ?? 0) !== ledger.application_fee_cents)
            throw new Error("payment_fee_mismatch");
        }
      }
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
      // Postgres RPC parameters are nullable at runtime; the regenerated types
      // narrow the arg to string, so cast to preserve passing null accounts.
      _account: (event.account ?? null) as string,
      _created: event.created,
      _change: change,
    }),
  );
  if ((change as { kind?: string }).kind === "subscription") {
    const customer = (change as { customer: string }).customer;
    const owner = checked(
      await paymentDb
        .from("organization_payment_accounts")
        .select("organization_id")
        .eq("stripe_customer_id", customer)
        .maybeSingle(),
    );
    if (owner) {
      checked(await paymentDb.rpc("enqueue_billing_sync", { _org: owner.organization_id }));
      if ((await syncOrganizationBilling(owner.organization_id)).pending)
        throw new Error("billing_sync_pending");
    }
  }
}
