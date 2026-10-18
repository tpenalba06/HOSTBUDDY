-- Restore the 0018 read gate only if explicitly desired. No snapshots are modified.
BEGIN;
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
