BEGIN;
CREATE FUNCTION public.list_guest_stay_access(_property uuid)
RETURNS TABLE(id uuid, opens_at timestamptz, expires_at timestamptz, revoked_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT a.id, a.opens_at, a.expires_at, a.revoked_at
  FROM public.guest_stay_access a
  JOIN public.properties p ON p.id = a.property_id
  WHERE p.id = _property AND public.is_org_admin(p.organization_id)
    AND a.expires_at > statement_timestamp() AND a.revoked_at IS NULL
  ORDER BY a.opens_at, a.id
  LIMIT 250;
$$;
REVOKE ALL ON FUNCTION public.list_guest_stay_access(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_guest_stay_access(uuid) TO authenticated;
COMMIT;
