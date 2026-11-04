-- Preview first. No customer row or snapshot is deleted or unpublished.
-- Rollback: remove properties_publication_billing_gate, restore get_public_guide
-- from 0010; keep the grace column for audit. Never reset customer data.
BEGIN;
ALTER TABLE public.organization_payment_accounts
 ADD COLUMN IF NOT EXISTS billing_grace_until timestamptz;

CREATE OR REPLACE FUNCTION public.set_billing_grace() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.subscription_status='past_due' AND OLD.subscription_status='active'
    AND NEW.stripe_subscription_id=OLD.stripe_subscription_id THEN
  NEW.billing_grace_until:=now()+interval '3 days';
 ELSIF NEW.subscription_status NOT IN ('active','past_due')
    OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id THEN
  NEW.billing_grace_until:=NULL;
 ELSIF NEW.subscription_status='active' THEN
  NEW.billing_grace_until:=NULL;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS payment_account_billing_grace ON public.organization_payment_accounts;
CREATE TRIGGER payment_account_billing_grace BEFORE UPDATE ON public.organization_payment_accounts
 FOR EACH ROW EXECUTE FUNCTION public.set_billing_grace();

CREATE OR REPLACE FUNCTION public.has_paid_publication_access(_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.organization_payment_accounts a
 WHERE a.organization_id=_org AND a.stripe_subscription_id IS NOT NULL AND (
 (a.subscription_status='active' AND a.current_period_end>now()) OR
 (a.subscription_status='past_due' AND a.billing_grace_until>now())));
$$;
REVOKE ALL ON FUNCTION public.has_paid_publication_access(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.has_paid_publication_access(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.guard_property_publication_billing() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer;
BEGIN
 -- Serialize changes to the billable inventory, including direct REST writes.
 IF TG_OP='DELETE' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(OLD.organization_id::text,18));
  RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' AND NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
  RAISE EXCEPTION 'property organization immutable';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.organization_id::text,18));
 IF NEW.status='published' THEN
  SELECT count(*)+1 INTO n FROM public.properties
   WHERE organization_id=NEW.organization_id AND id<>NEW.id AND status<>'archived';
  IF n>1 AND NOT public.has_paid_publication_access(NEW.organization_id) THEN
   RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='hb_subscription_required';
  END IF;
  IF n>1 AND (TG_OP='INSERT' OR (TG_OP='UPDATE' AND OLD.status='archived') OR EXISTS(SELECT 1 FROM public.organization_billing_sync
    WHERE organization_id=NEW.organization_id AND pending)) THEN
   RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='hb_billing_sync_required';
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS properties_publication_billing_gate ON public.properties;
CREATE TRIGGER properties_publication_billing_gate
 BEFORE INSERT OR DELETE OR UPDATE OF status,organization_id ON public.properties
 FOR EACH ROW EXECUTE FUNCTION public.guard_property_publication_billing();
REVOKE ALL ON FUNCTION public.guard_property_publication_billing(),public.set_billing_grace() FROM PUBLIC,anon,authenticated;

-- The read gate also covers pre-existing publications after cancellation/default.
-- Keep one deterministic free guide available; retain all other snapshots/data.
CREATE OR REPLACE FUNCTION public.get_public_guide(_slug text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT v.guide FROM public.properties p JOIN public.property_publications v ON v.property_id=p.id
 WHERE p.slug=_slug AND p.status='published' AND (
 public.has_paid_publication_access(p.organization_id) OR p.id=(
  SELECT f.id FROM public.properties f WHERE f.organization_id=p.organization_id AND f.status='published'
  ORDER BY f.published_at NULLS LAST,f.created_at,f.id LIMIT 1));
$$;
REVOKE ALL ON FUNCTION public.get_public_guide(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_guide(text) TO anon,authenticated,service_role;
COMMIT;
