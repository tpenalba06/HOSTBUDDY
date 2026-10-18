-- auth.users.email is varchar, whereas this RPC declares a text result.
-- No data or authorization changes. Rollback: restore the former function body.
CREATE OR REPLACE FUNCTION public.get_organization_team(_org uuid)
RETURNS TABLE(user_id uuid,email text,role public.org_role,joined_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_org_owner(_org) THEN RAISE EXCEPTION 'forbidden'; END IF;
 RETURN QUERY SELECT m.user_id,coalesce(u.email::text,''::text),m.role,m.created_at
 FROM public.organization_members m JOIN auth.users u ON u.id=m.user_id
 WHERE m.organization_id=_org ORDER BY m.created_at;
END $$;
