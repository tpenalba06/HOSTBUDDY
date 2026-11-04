-- Additive publication snapshot. No real content is removed.
-- Rollback: restore get_public_guide from build_public_guide_live, restore previous
-- storage delete policy, stop calling publish_property. Retain snapshots for recovery.
CREATE TABLE public.property_publications (
 property_id uuid PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 guide jsonb NOT NULL,
 published_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.property_publications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.property_publications FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.property_publications TO authenticated;
GRANT ALL ON public.property_publications TO service_role;
CREATE POLICY "members read publications" ON public.property_publications FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
INSERT INTO public.property_publications(property_id,organization_id,guide,published_at)
 SELECT p.id,p.organization_id,public.get_public_guide(p.slug),coalesce(p.published_at,now())
 FROM public.properties p WHERE p.status='published';
ALTER FUNCTION public.get_public_guide(text) RENAME TO build_public_guide_live;
REVOKE ALL ON FUNCTION public.build_public_guide_live(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.build_public_guide_live(text) TO service_role;
CREATE FUNCTION public.get_public_guide(_slug text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT v.guide FROM public.properties p JOIN public.property_publications v ON v.property_id=p.id
 WHERE p.slug=_slug AND p.status='published'
$$;
REVOKE ALL ON FUNCTION public.get_public_guide(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_guide(text) TO anon,authenticated,service_role;
CREATE FUNCTION public.publish_property(_property uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.properties; payload jsonb;
BEGIN
 SELECT * INTO p FROM public.properties WHERE id=_property FOR UPDATE;
 IF NOT FOUND OR NOT public.is_org_admin(p.organization_id) THEN RAISE EXCEPTION 'not allowed'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.guide_sections WHERE property_id=p.id AND is_visible) THEN RAISE EXCEPTION 'empty guide'; END IF;
 UPDATE public.properties SET status='published',published_at=now() WHERE id=p.id;
 payload:=public.build_public_guide_live(p.slug);
 INSERT INTO public.property_publications(property_id,organization_id,guide,published_at)
 VALUES(p.id,p.organization_id,payload,now())
 ON CONFLICT(property_id) DO UPDATE SET guide=excluded.guide,published_at=excluded.published_at;
END $$;
REVOKE ALL ON FUNCTION public.publish_property(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.publish_property(uuid) TO authenticated;
CREATE FUNCTION public.is_published_media(_path text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.property_publications v
 JOIN public.properties p ON p.id=v.property_id
 WHERE p.status='published' AND EXISTS(
 SELECT 1 FROM jsonb_array_elements(v.guide->'sections') s,
 jsonb_array_elements(coalesce(s->'media','[]'::jsonb)) m WHERE m->>'path'=_path))
$$;
REVOKE ALL ON FUNCTION public.is_published_media(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_published_media(text) TO authenticated;
DROP POLICY "admins delete guide media" ON storage.objects;
CREATE POLICY "admins delete guide media" ON storage.objects FOR DELETE TO authenticated
 USING (bucket_id='guide-media' AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/'
 AND public.is_org_admin(((storage.foldername(name))[1])::uuid)
 AND public.can_access_property(((storage.foldername(name))[2])::uuid)
 AND NOT public.is_published_media(name));
