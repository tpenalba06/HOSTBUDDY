BEGIN;

-- Each grant carries its own instructions. It is outside the publication,
-- translation, concierge and offline models.
CREATE TABLE public.guest_stay_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  token_hash bytea NOT NULL UNIQUE,
  opens_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  entry_instructions text CHECK (char_length(entry_instructions) <= 4000),
  wifi_ssid text CHECK (octet_length(wifi_ssid) BETWEEN 1 AND 32),
  wifi_password text CHECK (char_length(wifi_password) BETWEEN 1 AND 128),
  CHECK (expires_at > opens_at AND expires_at <= opens_at + interval '30 days'),
  CHECK ((wifi_ssid IS NULL) = (wifi_password IS NULL)),
  CHECK (nullif(btrim(entry_instructions), '') IS NOT NULL OR wifi_ssid IS NOT NULL)
);
CREATE INDEX guest_stay_access_property_idx ON public.guest_stay_access(property_id);
ALTER TABLE public.guest_stay_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.guest_stay_access FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.issue_guest_stay_access(
  _property uuid, _opens_at timestamptz, _expires_at timestamptz,
  _entry_instructions text, _wifi_ssid text, _wifi_password text
) RETURNS TABLE(id uuid, token text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = _property AND public.is_org_admin(p.organization_id)
  ) THEN RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501'; END IF;

  IF _expires_at <= statement_timestamp()
    OR _expires_at > statement_timestamp() + interval '90 days' THEN
    RAISE EXCEPTION 'invalid stay window' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
    INSERT INTO public.guest_stay_access AS access (
      property_id, token_hash, opens_at, expires_at, entry_instructions, wifi_ssid, wifi_password
    ) VALUES (
      _property, sha256(convert_to(_token, 'UTF8')), _opens_at, _expires_at,
      nullif(btrim(_entry_instructions), ''), _wifi_ssid, _wifi_password
    )
    RETURNING access.id, _token;
END;
$$;

CREATE FUNCTION public.revoke_guest_stay_access(_property uuid, _id uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  WITH changed AS (
    UPDATE public.guest_stay_access a SET revoked_at = statement_timestamp()
    FROM public.properties p
    WHERE a.id = _id AND a.property_id = _property AND p.id = a.property_id
      AND public.is_org_admin(p.organization_id) AND a.revoked_at IS NULL
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM changed);
$$;

-- Application servers call this RPC only from an uncached private request.
CREATE FUNCTION public.read_guest_stay_access(_slug text, _token text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'entryInstructions', a.entry_instructions,
    'wifiSsid', a.wifi_ssid,
    'wifiPassword', a.wifi_password,
    'expiresAt', a.expires_at
  )
  FROM public.guest_stay_access a
  JOIN public.properties p ON p.id = a.property_id
  WHERE p.slug = _slug AND p.status = 'published'
    AND length(_token) = 64 AND _token ~ '^[0-9a-f]{64}$'
    AND a.token_hash = sha256(convert_to(left(_token, 64), 'UTF8'))
    AND a.revoked_at IS NULL
    AND a.opens_at <= statement_timestamp()
    AND a.expires_at > statement_timestamp();
$$;

REVOKE ALL ON FUNCTION public.issue_guest_stay_access(uuid,timestamptz,timestamptz,text,text,text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.revoke_guest_stay_access(uuid,uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.read_guest_stay_access(text,text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.issue_guest_stay_access(uuid,timestamptz,timestamptz,text,text,text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_guest_stay_access(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.read_guest_stay_access(text,text) TO service_role;
COMMIT;
