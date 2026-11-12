-- Independent of 0021: additive billing policy, no deletion and no Stripe calls.
BEGIN;
CREATE TABLE IF NOT EXISTS public.organization_billing_capacity (
 organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
 subscription_id text NOT NULL,
 period_start bigint NOT NULL,
 period_end bigint NOT NULL CHECK(period_end>period_start),
 paid_capacity integer NOT NULL CHECK(paid_capacity>=2),
 renewal_quantity integer NOT NULL CHECK(renewal_quantity>=0),
 schedule_id text,
 invoice_id text NOT NULL,
 revision bigint NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organization_billing_capacity ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organization_billing_capacity FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.organization_billing_capacity TO service_role;
CREATE OR REPLACE FUNCTION public.record_billing_capacity(_org uuid,_lease uuid,_revision bigint,_state jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old public.organization_billing_capacity%ROWTYPE;
BEGIN
 PERFORM 1 FROM public.organization_billing_sync WHERE organization_id=_org
  AND lease_token=_lease AND lease_until>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'billing lease expired'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.organization_payment_accounts WHERE organization_id=_org
  AND stripe_subscription_id=_state->>'subscriptionId') THEN RAISE EXCEPTION 'billing subscription mismatch'; END IF;
 SELECT * INTO old FROM public.organization_billing_capacity WHERE organization_id=_org FOR UPDATE;
 IF old.subscription_id=_state->>'subscriptionId' AND (
  old.period_start>(_state->>'periodStart')::bigint OR
  (old.period_start=(_state->>'periodStart')::bigint AND
   (old.paid_capacity>(_state->>'paidCapacity')::integer OR old.period_end<>(_state->>'periodEnd')::bigint))) THEN
  RAISE EXCEPTION 'billing capacity regression';
 END IF;
 IF old.revision>_revision THEN RAISE EXCEPTION 'billing stale revision'; END IF;
 INSERT INTO public.organization_billing_capacity(organization_id,subscription_id,period_start,period_end,
 paid_capacity,renewal_quantity,schedule_id,invoice_id,revision)
 VALUES(_org,_state->>'subscriptionId',(_state->>'periodStart')::bigint,(_state->>'periodEnd')::bigint,
 (_state->>'paidCapacity')::integer,(_state->>'renewalQuantity')::integer,_state->>'scheduleId',_state->>'invoiceId',_revision)
 ON CONFLICT(organization_id) DO UPDATE SET subscription_id=excluded.subscription_id,
 period_start=excluded.period_start,period_end=excluded.period_end,paid_capacity=excluded.paid_capacity,
 renewal_quantity=excluded.renewal_quantity,schedule_id=excluded.schedule_id,invoice_id=excluded.invoice_id,
 revision=excluded.revision,updated_at=now();
END $$;
REVOKE ALL ON FUNCTION public.record_billing_capacity(uuid,uuid,bigint,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_billing_capacity(uuid,uuid,bigint,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.refresh_billing_sync_lease(_org uuid,_lease uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.organization_billing_sync SET lease_until=now()+interval '5 minutes'
 WHERE organization_id=_org AND lease_token=_lease AND lease_until>now();
 IF NOT FOUND THEN RAISE EXCEPTION 'billing lease expired'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.refresh_billing_sync_lease(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_billing_sync_lease(uuid,uuid) TO service_role;
-- Renewal webhooks refresh the period and requeue reconciliation. No remote call here.
INSERT INTO public.organization_billing_sync(organization_id) SELECT organization_id
 FROM public.organization_payment_accounts WHERE stripe_subscription_id IS NOT NULL
 ON CONFLICT(organization_id) DO UPDATE SET revision=organization_billing_sync.revision+1,updated_at=now();
COMMIT;
