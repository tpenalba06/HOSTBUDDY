-- Additive: preserve existing payments with their original zero fee.
-- Rollback: disable billing-sync scheduler/route, drop the properties trigger;
-- retain queue and financial columns for audit. Never reset or delete customer data.
ALTER TABLE public.order_payments
 ADD COLUMN IF NOT EXISTS application_fee_cents integer NOT NULL DEFAULT 0 CHECK(application_fee_cents>=0 AND application_fee_cents<amount_cents);
ALTER TABLE public.organization_payment_accounts ADD COLUMN IF NOT EXISTS service_fee_terms_version text,
 ADD COLUMN IF NOT EXISTS service_fee_terms_accepted_at timestamptz;
CREATE TABLE IF NOT EXISTS public.organization_billing_sync (
 organization_id uuid PRIMARY KEY REFERENCES public.organizations(id),
 revision bigint NOT NULL DEFAULT 1,
 synced_revision bigint NOT NULL DEFAULT 0,
 pending boolean GENERATED ALWAYS AS (revision>synced_revision) STORED,
 lease_token uuid,
 lease_until timestamptz,
 last_error text,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organization_billing_sync ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organization_billing_sync FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.organization_billing_sync TO service_role;
CREATE OR REPLACE FUNCTION public.enqueue_billing_sync(_org uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 INSERT INTO public.organization_billing_sync(organization_id) VALUES(_org)
 ON CONFLICT(organization_id) DO UPDATE SET revision=organization_billing_sync.revision+1,updated_at=now();
$$;
CREATE OR REPLACE FUNCTION public.queue_property_billing_sync() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN PERFORM public.enqueue_billing_sync(NEW.organization_id);
 ELSIF TG_OP='DELETE' THEN PERFORM public.enqueue_billing_sync(OLD.organization_id);
 ELSIF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
  PERFORM public.enqueue_billing_sync(OLD.organization_id); PERFORM public.enqueue_billing_sync(NEW.organization_id);
 ELSIF (NEW.status='archived') IS DISTINCT FROM (OLD.status='archived') THEN
  PERFORM public.enqueue_billing_sync(NEW.organization_id);
 END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER properties_billing_sync AFTER INSERT OR DELETE OR UPDATE OF status,organization_id
 ON public.properties FOR EACH ROW EXECUTE FUNCTION public.queue_property_billing_sync();
CREATE OR REPLACE FUNCTION public.claim_billing_sync(_org uuid,_lease uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE job public.organization_billing_sync; n integer;
BEGIN
 UPDATE public.organization_billing_sync SET lease_token=_lease,lease_until=now()+interval '5 minutes'
 WHERE organization_id=_org AND synced_revision<revision AND (lease_until IS NULL OR lease_until<now()) RETURNING * INTO job;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT count(*) INTO n FROM public.properties WHERE organization_id=_org AND status<>'archived';
 RETURN jsonb_build_object('revision',job.revision,'propertyCount',n);
END $$;
CREATE OR REPLACE FUNCTION public.complete_billing_sync(_org uuid,_lease uuid,_revision bigint,_error text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 UPDATE public.organization_billing_sync SET synced_revision=CASE WHEN _error IS NULL THEN greatest(synced_revision,_revision) ELSE synced_revision END,
 lease_token=NULL,lease_until=NULL,last_error=_error,updated_at=now()
 WHERE organization_id=_org AND lease_token=_lease;
$$;
REVOKE ALL ON FUNCTION public.enqueue_billing_sync(uuid),public.queue_property_billing_sync(),public.claim_billing_sync(uuid,uuid),public.complete_billing_sync(uuid,uuid,bigint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_billing_sync(uuid),public.claim_billing_sync(uuid,uuid),public.complete_billing_sync(uuid,uuid,bigint,text) TO service_role;
-- Only queue existing organizations; this migration itself performs no Stripe calls.
INSERT INTO public.organization_billing_sync(organization_id) SELECT id FROM public.organizations ON CONFLICT DO NOTHING;
