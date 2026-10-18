-- Additive deletion capability. No existing property is deleted by this migration.
BEGIN;
-- Preserve the organization's payment ledger when its deleted order disappears.
ALTER TABLE public.order_payments ALTER COLUMN order_id DROP NOT NULL;
CREATE TABLE public.property_deletion_cleanup (
 property_id uuid PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 confirmed_name text NOT NULL,
 paths text[] NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.property_deletion_cleanup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.property_deletion_cleanup FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.property_deletion_cleanup TO service_role;
GRANT SELECT ON public.property_deletion_cleanup TO authenticated;
CREATE POLICY "admins read pending property cleanup" ON public.property_deletion_cleanup
 FOR SELECT TO authenticated USING(public.is_org_admin(organization_id));
-- Direct REST deletion must not bypass confirmation, PMS cleanup or Storage cleanup.
REVOKE DELETE ON public.properties FROM authenticated;

-- Serialize object creation with deletion so an in-flight upload cannot become an orphan.
CREATE FUNCTION public.guard_property_storage_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.bucket_id='guide-media' THEN
  PERFORM 1 FROM public.properties WHERE id=split_part(NEW.name,'/',2)::uuid
   AND organization_id=split_part(NEW.name,'/',1)::uuid FOR KEY SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'property unavailable'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER property_storage_write BEFORE INSERT OR UPDATE OF name,bucket_id ON storage.objects
 FOR EACH ROW EXECUTE FUNCTION public.guard_property_storage_write();
REVOKE ALL ON FUNCTION public.guard_property_storage_write() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.delete_property_permanently(_property uuid,_confirmed_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.properties%ROWTYPE; job public.property_deletion_cleanup%ROWTYPE; org uuid; paths text[];
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not allowed'; END IF;
 SELECT organization_id INTO org FROM public.properties WHERE id=_property;
 IF org IS NULL THEN
  SELECT * INTO job FROM public.property_deletion_cleanup WHERE property_id=_property;
  IF job.property_id IS NULL OR NOT public.is_org_admin(job.organization_id) THEN RAISE EXCEPTION 'not allowed'; END IF;
  IF _confirmed_name IS DISTINCT FROM job.confirmed_name THEN RAISE EXCEPTION 'confirmation mismatch'; END IF;
  RETURN to_jsonb(job);
 END IF;
 IF NOT public.is_org_admin(org) THEN RAISE EXCEPTION 'not allowed'; END IF;
 -- Match publish_property's lock order: property first, then organization billing lock.
 SELECT * INTO p FROM public.properties WHERE id=_property FOR UPDATE;
 PERFORM pg_advisory_xact_lock(hashtextextended(org::text,18));
 IF p.id IS NULL THEN
  SELECT * INTO job FROM public.property_deletion_cleanup WHERE property_id=_property;
  IF job.property_id IS NULL OR NOT public.is_org_admin(job.organization_id) THEN RAISE EXCEPTION 'not allowed'; END IF;
  IF _confirmed_name IS DISTINCT FROM job.confirmed_name THEN RAISE EXCEPTION 'confirmation mismatch'; END IF;
  RETURN to_jsonb(job);
 END IF;
 IF _confirmed_name IS DISTINCT FROM p.name THEN RAISE EXCEPTION 'confirmation mismatch'; END IF;
 -- Only this property's Storage namespace. Preserve files referenced by other properties/global services.
 SELECT coalesce(array_agg(o.name),'{}'::text[]) INTO paths FROM storage.objects o
 WHERE o.bucket_id='guide-media' AND starts_with(o.name,org::text||'/'||p.id::text||'/')
 AND NOT EXISTS(SELECT 1 FROM public.section_media m WHERE m.storage_path=o.name AND m.property_id<>p.id)
 AND NOT EXISTS(SELECT 1 FROM public.services s WHERE s.image_path=o.name AND s.property_id IS DISTINCT FROM p.id);
 INSERT INTO public.property_deletion_cleanup(property_id,organization_id,confirmed_name,paths)
 VALUES(p.id,org,p.name,paths) RETURNING * INTO job;
 -- Non-cascading / SET NULL references require explicit treatment in this transaction.
 DELETE FROM public.provider_import_links WHERE property_id=p.id AND organization_id=org;
 DELETE FROM public.import_runs WHERE property_id=p.id AND organization_id=org;
 UPDATE public.order_payments SET order_id=NULL WHERE order_id IN
  (SELECT id FROM public.orders WHERE property_id=p.id AND organization_id=org);
 DELETE FROM public.orders WHERE property_id=p.id AND organization_id=org;
 -- Cascades fields, sections/translations/media, settings/reviews, conversations/messages/
 -- sessions, property services, feedback and publication. RESTRICT protects foreign orders.
 DELETE FROM public.properties WHERE id=p.id AND organization_id=org;
 -- Existing DELETE trigger enqueues billing from the authoritative remaining inventory.
 RETURN to_jsonb(job);
END $$;
REVOKE ALL ON FUNCTION public.delete_property_permanently(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.delete_property_permanently(uuid,text) TO authenticated;
COMMIT;
