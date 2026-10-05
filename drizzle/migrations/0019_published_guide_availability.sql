-- P0: a saved, explicitly published snapshot must remain available to guests.
-- Billing authorization stays enforced by properties_publication_billing_gate
-- and publish_property. A rejected second publication cannot affect prior guides.
-- No customer data, snapshot, table policy, or table grant changes.
-- Validate in a rollback transaction first. Apply only to an authorized database.
-- Rollback: scripts/rollback/0019_published_guide_availability.sql.
BEGIN;
CREATE OR REPLACE FUNCTION public.get_public_guide(_slug text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT v.guide FROM public.properties p
 JOIN public.property_publications v ON v.property_id=p.id
 WHERE p.slug=_slug AND p.status='published';
$$;
REVOKE ALL ON FUNCTION public.get_public_guide(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_guide(text) TO anon,authenticated,service_role;
COMMIT;
