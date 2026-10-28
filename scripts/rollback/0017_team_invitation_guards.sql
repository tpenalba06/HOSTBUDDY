-- EXACT preview-only rollback. Reopens the owner-downgrade/invitation and
-- message-history mutation flaws. Do NOT use on production.
-- Deliberate opt-in required: SET hostbuddy.allow_insecure_preview_rollback='true';
BEGIN;
DO $$ BEGIN IF coalesce(current_setting('hostbuddy.allow_insecure_preview_rollback',true),'false')<>'true' THEN RAISE EXCEPTION 'Unsafe rollback: explicit preview opt-in required'; END IF; END $$;
GRANT INSERT,UPDATE,DELETE ON public.organization_invitations TO authenticated;
REVOKE UPDATE(read_at) ON public.messages FROM authenticated;
GRANT UPDATE,DELETE ON public.messages TO authenticated;
DROP POLICY IF EXISTS "members read import runs" ON public.import_runs;
DROP POLICY IF EXISTS "admins manage import runs" ON public.import_runs;
DROP POLICY IF EXISTS "members all import runs" ON public.import_runs;
CREATE POLICY "members all import runs" ON public.import_runs FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));
CREATE OR REPLACE FUNCTION public.invite_organization_member(_org uuid, _email text, _role public.org_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _target auth.users%ROWTYPE;
BEGIN
 IF NOT public.is_org_owner(_org) OR _role = 'owner' THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT * INTO _target FROM auth.users WHERE lower(email) = lower(trim(_email));
 IF _target.id IS NOT NULL THEN
  IF EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _target.id AND organization_id <> _org) THEN RAISE EXCEPTION 'already member'; END IF;
  INSERT INTO public.organization_members(organization_id,user_id,role) VALUES (_org,_target.id,_role) ON CONFLICT (organization_id,user_id) DO UPDATE SET role=excluded.role;
 ELSE INSERT INTO public.organization_invitations(organization_id,email,role,invited_by) VALUES (_org,lower(trim(_email)),_role,auth.uid()) ON CONFLICT (organization_id,email) DO UPDATE SET role=excluded.role,invited_by=auth.uid(); END IF;
END $$;
REVOKE ALL ON FUNCTION public.invite_organization_member(uuid,text,public.org_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_organization_member(uuid,text,public.org_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_my_organization(_first_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid; _uid uuid := auth.uid(); _email text := lower(coalesce(auth.jwt()->>'email','')); _invite public.organization_invitations%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT organization_id INTO _org FROM organization_members WHERE user_id = _uid ORDER BY created_at LIMIT 1;
  IF _org IS NOT NULL THEN RETURN _org; END IF;
  SELECT * INTO _invite FROM organization_invitations WHERE lower(email) = _email AND accepted_at IS NULL ORDER BY created_at LIMIT 1;
  IF _invite.id IS NOT NULL THEN
    INSERT INTO organization_members(organization_id, user_id, role) VALUES (_invite.organization_id, _uid, _invite.role) ON CONFLICT DO NOTHING;
    UPDATE organization_invitations SET accepted_at = now() WHERE id = _invite.id;
    RETURN _invite.organization_id;
  END IF;
  INSERT INTO organizations(name) VALUES ('Conciergerie de ' || coalesce(nullif(left(trim(_first_name), 60), ''), 'moi')) RETURNING id INTO _org;
  INSERT INTO organization_members(organization_id, user_id, role) VALUES (_org, _uid, 'owner');
  RETURN _org;
END $$;


COMMIT;
