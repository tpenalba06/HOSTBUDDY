-- Safe replacement of RPCs and grants; no existing rows modified.
-- Apply on preview only after scripts/validation/team-tenant-isolation.sql passes.
BEGIN;
-- Manager replies remain inserts; marking as read is the only message mutation.
REVOKE UPDATE, DELETE ON public.messages FROM authenticated;
GRANT UPDATE(read_at) ON public.messages TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.organization_invitations FROM authenticated;

CREATE OR REPLACE FUNCTION public.invite_organization_member(_org uuid, _email text, _role public.org_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _target auth.users%ROWTYPE; _affected integer;
BEGIN
 IF NOT public.is_org_owner(_org) OR _role IS NULL OR _role NOT IN ('admin','member') THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF char_length(trim(coalesce(_email,''))) NOT BETWEEN 3 AND 320 OR position('@' IN _email) = 0 THEN RAISE EXCEPTION 'invalid email'; END IF;
 SELECT * INTO _target FROM auth.users WHERE lower(email) = lower(trim(_email));
 IF _target.id IS NOT NULL THEN
  IF EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _target.id AND organization_id <> _org) THEN RAISE EXCEPTION 'already member'; END IF;
  INSERT INTO public.organization_members(organization_id,user_id,role) VALUES (_org,_target.id,_role)
  ON CONFLICT (organization_id,user_id) DO UPDATE SET role=excluded.role
  WHERE organization_members.role <> 'owner';
  GET DIAGNOSTICS _affected=ROW_COUNT;
  IF _affected=0 THEN RAISE EXCEPTION 'owner protected'; END IF;
 ELSE
  INSERT INTO public.organization_invitations(organization_id,email,role,invited_by)
  VALUES (_org,lower(trim(_email)),_role,auth.uid())
  ON CONFLICT (organization_id,email) DO UPDATE SET role=excluded.role,invited_by=auth.uid(),accepted_at=NULL;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.invite_organization_member(uuid,text,public.org_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_organization_member(uuid,text,public.org_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_my_organization(_first_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid; _uid uuid := auth.uid(); _email text := lower(coalesce(auth.jwt()->>'email','')); _invite public.organization_invitations%ROWTYPE;
BEGIN
 IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
 -- Serialize concurrent first loads for the same user; avoid duplicate organizations.
 PERFORM pg_advisory_xact_lock(hashtextextended(_uid::text,0));
 SELECT organization_id INTO _org FROM public.organization_members WHERE user_id=_uid ORDER BY created_at LIMIT 1;
 IF _org IS NOT NULL THEN RETURN _org; END IF;
 SELECT * INTO _invite FROM public.organization_invitations
 WHERE lower(email)=_email AND accepted_at IS NULL AND role IN ('admin','member')
 ORDER BY created_at LIMIT 1 FOR UPDATE;
 IF _invite.id IS NOT NULL THEN
  INSERT INTO public.organization_members(organization_id,user_id,role) VALUES (_invite.organization_id,_uid,_invite.role) ON CONFLICT DO NOTHING;
  UPDATE public.organization_invitations SET accepted_at=now() WHERE id=_invite.id;
  RETURN _invite.organization_id;
 END IF;
 INSERT INTO public.organizations(name) VALUES ('Conciergerie de '||coalesce(nullif(left(trim(_first_name),60),''),'moi')) RETURNING id INTO _org;
 INSERT INTO public.organization_members(organization_id,user_id,role) VALUES (_org,_uid,'owner');
 RETURN _org;
END $$;
REVOKE ALL ON FUNCTION public.ensure_my_organization(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_organization(text) TO authenticated;

DROP POLICY IF EXISTS "members all import runs" ON public.import_runs;
DROP POLICY IF EXISTS "members read import runs" ON public.import_runs;
DROP POLICY IF EXISTS "admins manage import runs" ON public.import_runs;
CREATE POLICY "members read import runs" ON public.import_runs FOR SELECT TO authenticated
 USING (public.is_org_member(organization_id));
CREATE POLICY "admins manage import runs" ON public.import_runs FOR ALL TO authenticated
 USING (public.is_org_admin(organization_id))
 WITH CHECK (public.is_org_admin(organization_id) AND (property_id IS NULL OR EXISTS (
  SELECT 1 FROM public.properties p WHERE p.id=property_id AND p.organization_id=import_runs.organization_id)));
COMMIT;
