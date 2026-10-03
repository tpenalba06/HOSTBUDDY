-- Tighten the remaining content-write policy: members read, owners/admins edit.
-- No rows are modified; apply transactionally. Rollback is documented in docs/v1-production.md.
BEGIN;
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
COMMIT;
