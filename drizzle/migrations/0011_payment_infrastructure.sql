-- Additive, dormant until Stripe configuration passes real test-mode validation.
-- Rollback: disable STRIPE_LIVE_VERIFIED and remove payment routes; retain ledger.
CREATE TABLE public.organization_payment_accounts (
 organization_id uuid PRIMARY KEY REFERENCES public.organizations(id),
 stripe_customer_id text UNIQUE,
 stripe_subscription_id text UNIQUE,
 subscription_status text NOT NULL DEFAULT 'not_configured',
 current_period_end timestamptz,
 stripe_account_id text UNIQUE,
 charges_enabled boolean NOT NULL DEFAULT false,
 payouts_enabled boolean NOT NULL DEFAULT false,
 last_event_created bigint NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.order_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id),
 stripe_account_id text NOT NULL,
 checkout_session_id text UNIQUE,
 payment_intent_id text UNIQUE,
 amount_cents integer NOT NULL CHECK(amount_cents>0),
 currency text NOT NULL DEFAULT 'eur' CHECK(currency='eur'),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','failed','expired','partially_refunded','refunded')),
 token_hash text UNIQUE NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '48 hours',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.stripe_processed_events (
 event_id text PRIMARY KEY,
 account_id text,
 processed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organization_payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_processed_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organization_payment_accounts,public.order_payments,public.stripe_processed_events FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.organization_payment_accounts,public.order_payments,public.stripe_processed_events TO service_role;
GRANT SELECT ON public.organization_payment_accounts TO authenticated;
CREATE POLICY "owners read payment settings" ON public.organization_payment_accounts FOR SELECT TO authenticated USING(public.is_org_owner(organization_id));
-- Capabilities are never readable even by an authenticated manager. Read sanitized
-- payment information through owner-authorized server functions instead.
CREATE FUNCTION public.apply_stripe_event(_event text,_account text,_created bigint,_change jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inserted integer;
BEGIN
 INSERT INTO public.stripe_processed_events(event_id,account_id) VALUES(_event,_account) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 IF inserted=0 THEN RETURN false; END IF;
 IF _change->>'kind'='subscription' THEN
  UPDATE public.organization_payment_accounts SET
   stripe_subscription_id=_change->>'subscription', subscription_status=_change->>'status',
   current_period_end=(_change->>'period_end')::timestamptz,last_event_created=_created,updated_at=now()
   WHERE stripe_customer_id=_change->>'customer' AND _account IS NULL AND last_event_created<=_created;
 ELSIF _change->>'kind'='payment' THEN
  UPDATE public.order_payments SET
   status=CASE WHEN status='refunded' THEN status WHEN status IN ('refunded','partially_refunded') AND _change->>'status'='paid' THEN status
    WHEN status IN ('paid','refunded','partially_refunded') AND _change->>'status' IN ('pending','failed','expired') THEN status
    ELSE _change->>'status' END,
   payment_intent_id=coalesce(_change->>'intent',payment_intent_id),updated_at=now()
   WHERE stripe_account_id=_account AND (checkout_session_id=_change->>'session' OR payment_intent_id=_change->>'intent')
    AND (_change->>'status'<>'paid' OR (amount_cents=(_change->>'amount')::integer AND currency=_change->>'currency'));
 END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.apply_stripe_event(text,text,bigint,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_stripe_event(text,text,bigint,jsonb) TO service_role;
