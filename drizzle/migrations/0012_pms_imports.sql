-- Additive. Rollback: disable provider routes; keep drafts and import links.
CREATE TABLE public.pms_connections (
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 provider text NOT NULL CHECK(provider='guesty'),
 encrypted_credentials text NOT NULL,
 token_expires_at timestamptz,
 refresh_lease_until timestamptz,
 last_success_at timestamptz,
 PRIMARY KEY(organization_id,provider)
);
CREATE TABLE public.provider_import_links (
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 provider text NOT NULL,
 external_id text NOT NULL,
 property_id uuid NOT NULL REFERENCES public.properties(id),
 imported_at timestamptz NOT NULL DEFAULT now(),
 import_mode text NOT NULL DEFAULT 'one_time' CHECK(import_mode='one_time'),
 PRIMARY KEY(organization_id,provider,external_id)
);
ALTER TABLE public.pms_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_import_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pms_connections,public.provider_import_links FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.pms_connections,public.provider_import_links TO service_role;
GRANT SELECT ON public.provider_import_links TO authenticated;
CREATE POLICY "members read import provenance" ON public.provider_import_links FOR SELECT TO authenticated USING(public.is_org_member(organization_id));
CREATE FUNCTION public.acquire_provider_token_lease(_org uuid,_provider text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 WITH locked AS (UPDATE public.pms_connections SET refresh_lease_until=now()+interval '30 seconds' WHERE organization_id=_org AND provider=_provider AND (refresh_lease_until IS NULL OR refresh_lease_until<now()) RETURNING 1) SELECT EXISTS(SELECT 1 FROM locked)
$$;
REVOKE ALL ON FUNCTION public.acquire_provider_token_lease(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_provider_token_lease(uuid,text) TO service_role;
CREATE FUNCTION public.create_provider_draft(_org uuid,_provider text,_external text,_name text,_fields jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE pid uuid; field jsonb;
BEGIN
 IF NOT public.is_org_admin(_org) THEN RAISE EXCEPTION 'not allowed'; END IF;
 IF _provider<>'guesty' OR char_length(_external) NOT BETWEEN 1 AND 120 OR jsonb_typeof(_fields)<>'array' OR jsonb_array_length(_fields)>100 THEN RAISE EXCEPTION 'invalid import'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_org::text||_provider||_external,0));
 SELECT property_id INTO pid FROM public.provider_import_links WHERE organization_id=_org AND provider=_provider AND external_id=_external;
 IF FOUND THEN RETURN pid; END IF;
 pid:=gen_random_uuid();
 INSERT INTO public.properties(id,organization_id,name,slug,status,source_type,source_url)
 VALUES(pid,_org,left(coalesce(nullif(trim(_name),''),'Mon logement'),120),'guesty-'||pid::text,'draft','pms','guesty:'||_external);
 FOR field IN SELECT value FROM jsonb_array_elements(_fields) LOOP
  INSERT INTO public.property_fields(property_id,key,category,label,essential,question,value,status,raw_value,confidence,source_type,source_url,imported_at,manually_verified,manually_overridden)
  VALUES(pid,field->>'key',field->>'category',field->>'label',coalesce((field->>'essential')::boolean,false),field->>'question',field->>'value',CASE WHEN nullif(field->>'value','') IS NULL THEN 'missing'::public.field_status ELSE 'to_verify'::public.field_status END,field->>'rawValue',coalesce((field->>'confidence')::numeric,0),'pms','guesty:'||_external,now(),false,false);
 END LOOP;
 INSERT INTO public.provider_import_links(organization_id,provider,external_id,property_id) VALUES(_org,_provider,_external,pid);
 RETURN pid;
END $$;
REVOKE ALL ON FUNCTION public.create_provider_draft(uuid,text,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_provider_draft(uuid,text,text,text,jsonb) TO authenticated;
