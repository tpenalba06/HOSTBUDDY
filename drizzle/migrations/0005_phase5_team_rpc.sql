CREATE OR REPLACE FUNCTION public.get_organization_team(_org uuid)
RETURNS TABLE(user_id uuid, email text, role public.org_role, joined_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_org_owner(_org) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT m.user_id, coalesce(u.email, ''), m.role, m.created_at FROM public.organization_members m JOIN auth.users u ON u.id = m.user_id WHERE m.organization_id = _org ORDER BY m.created_at;
END $$;
REVOKE ALL ON FUNCTION public.get_organization_team(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_organization_team(uuid) TO authenticated, service_role;
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
CREATE OR REPLACE FUNCTION public.change_organization_member_role(_org uuid,_user uuid,_role public.org_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT public.is_org_owner(_org) OR _role='owner' THEN RAISE EXCEPTION 'forbidden'; END IF; UPDATE public.organization_members SET role=_role WHERE organization_id=_org AND user_id=_user AND role<>'owner'; END $$;
REVOKE ALL ON FUNCTION public.change_organization_member_role(uuid,uuid,public.org_role) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION public.change_organization_member_role(uuid,uuid,public.org_role) TO authenticated;
CREATE OR REPLACE FUNCTION public.remove_organization_member(_org uuid,_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT public.is_org_owner(_org) THEN RAISE EXCEPTION 'forbidden'; END IF; DELETE FROM public.organization_members WHERE organization_id=_org AND user_id=_user AND role<>'owner'; END $$;
REVOKE ALL ON FUNCTION public.remove_organization_member(uuid,uuid) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION public.remove_organization_member(uuid,uuid) TO authenticated;