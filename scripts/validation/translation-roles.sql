-- All fixtures and policy changes are rolled back. No existing row is updated.
BEGIN;
CREATE TEMP TABLE hb_v1_context AS SELECT gen_random_uuid() org_a,gen_random_uuid() org_b,gen_random_uuid() prop_a,gen_random_uuid() prop_b,gen_random_uuid() section_a,m.user_id actor FROM public.organization_members m JOIN public.properties p ON p.organization_id=m.organization_id WHERE p.id='977b8f7f-2505-4c8f-8076-09b1ba8847ff' AND m.role='owner' LIMIT 1;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM hb_v1_context) THEN RAISE EXCEPTION 'Test actor missing'; END IF; END $$;
CREATE TEMP TABLE hb_v1_results (test text, passed boolean);
GRANT SELECT ON hb_v1_context TO authenticated,anon;
GRANT INSERT,SELECT ON hb_v1_results TO authenticated,anon;
INSERT INTO public.organizations(id,name) SELECT org_a,'HB isolated validation A' FROM hb_v1_context UNION ALL SELECT org_b,'HB isolated validation B' FROM hb_v1_context;
INSERT INTO public.organization_members(organization_id,user_id,role) SELECT org_a,actor,'member' FROM hb_v1_context;
INSERT INTO public.properties(id,organization_id,name,slug) SELECT prop_a,org_a,'HB validation A','hb-rls-a-'||prop_a FROM hb_v1_context UNION ALL SELECT prop_b,org_b,'HB validation B','hb-rls-b-'||prop_b FROM hb_v1_context;
INSERT INTO public.guide_sections(id,property_id,section_key,title) SELECT section_a,prop_a,'welcome','Welcome' FROM hb_v1_context;
DROP POLICY IF EXISTS "members all guide translations" ON public.guide_section_translations;
DROP POLICY IF EXISTS "members read guide translations" ON public.guide_section_translations;
DROP POLICY IF EXISTS "admins manage guide translations" ON public.guide_section_translations;
CREATE POLICY "members read guide translations" ON public.guide_section_translations
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.guide_sections s WHERE s.id = section_id AND public.can_access_property(s.property_id)));
CREATE POLICY "admins manage guide translations" ON public.guide_section_translations
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.guide_sections s JOIN public.properties p ON p.id = s.property_id WHERE s.id = section_id AND public.is_org_admin(p.organization_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.guide_sections s JOIN public.properties p ON p.id = s.property_id WHERE s.id = section_id AND public.is_org_admin(p.organization_id)));

SELECT set_config('request.jwt.claim.sub',(SELECT actor::text FROM hb_v1_context),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE n integer; BEGIN
 INSERT INTO hb_v1_results SELECT 'member reads own property',count(*)=1 FROM public.properties WHERE id=(SELECT prop_a FROM hb_v1_context);
 INSERT INTO hb_v1_results SELECT 'other tenant hidden',count(*)=0 FROM public.properties WHERE id=(SELECT prop_b FROM hb_v1_context);
 UPDATE public.properties SET name='Forbidden change' WHERE id=(SELECT prop_a FROM hb_v1_context); GET DIAGNOSTICS n=ROW_COUNT;
 INSERT INTO hb_v1_results VALUES ('member cannot edit property',n=0);
 BEGIN
  INSERT INTO public.guide_section_translations(section_id,locale,title,source_updated_at) SELECT section_a,'en','Forbidden',now() FROM hb_v1_context;
  INSERT INTO hb_v1_results VALUES ('member cannot write translation',false);
 EXCEPTION WHEN insufficient_privilege THEN INSERT INTO hb_v1_results VALUES ('member cannot write translation',true); END;
END $$;
RESET ROLE;
UPDATE public.organization_members SET role='admin' WHERE organization_id=(SELECT org_a FROM hb_v1_context);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  INSERT INTO public.guide_section_translations(section_id,locale,title,source_updated_at) SELECT section_a,'de','Admin translation',now() FROM hb_v1_context;
  INSERT INTO hb_v1_results VALUES ('admin writes translation',true);
 EXCEPTION WHEN OTHERS THEN INSERT INTO hb_v1_results VALUES ('admin writes translation',false); END;
 BEGIN
  PERFORM public.change_organization_member_role((SELECT org_a FROM hb_v1_context),(SELECT actor FROM hb_v1_context),'member');
  INSERT INTO hb_v1_results VALUES ('admin cannot change team roles',false);
 EXCEPTION WHEN OTHERS THEN INSERT INTO hb_v1_results VALUES ('admin cannot change team roles',true); END;
END $$;
RESET ROLE;
UPDATE public.organization_members SET role='owner' WHERE organization_id=(SELECT org_a FROM hb_v1_context);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  INSERT INTO public.guide_section_translations(section_id,locale,title,source_updated_at) SELECT section_a,'es','Owner translation',now() FROM hb_v1_context;
  INSERT INTO hb_v1_results VALUES ('owner writes translation',true);
 EXCEPTION WHEN OTHERS THEN INSERT INTO hb_v1_results VALUES ('owner writes translation',false); END;
END $$;
SET LOCAL ROLE anon;
INSERT INTO hb_v1_results SELECT 'draft public RPC hidden',public.get_public_guide('hb-rls-a-'||prop_a) IS NULL FROM hb_v1_context;
RESET ROLE;
SELECT test,passed FROM hb_v1_results ORDER BY test;
ROLLBACK;
