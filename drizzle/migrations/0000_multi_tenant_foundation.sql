CREATE TYPE public.org_role AS ENUM ('owner','admin','member');
CREATE TYPE public.property_status AS ENUM ('draft','published','archived');
CREATE TYPE public.field_status AS ENUM ('found','to_verify','missing');
CREATE TYPE public.import_status AS ENUM ('pending','running','succeeded','insufficient','failed');

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  trial_started_at timestamptz NOT NULL DEFAULT now(),
  trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);
CREATE TABLE public.organization_members (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.org_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);
CREATE INDEX ON public.organization_members(user_id);
CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Mon logement',
  slug text NOT NULL UNIQUE,
  status public.property_status NOT NULL DEFAULT 'draft',
  source_type text,
  source_url text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.properties(organization_id);
CREATE TABLE public.import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  source_type text NOT NULL,
  source_url text,
  raw_text text,
  status public.import_status NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX ON public.import_runs(organization_id);
CREATE TABLE public.property_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  key text NOT NULL,
  category text NOT NULL,
  label text NOT NULL,
  value text,
  status public.field_status NOT NULL DEFAULT 'missing',
  essential boolean NOT NULL DEFAULT false,
  question text,
  source_type text,
  source_url text,
  raw_value text,
  confidence numeric NOT NULL DEFAULT 0,
  imported_at timestamptz,
  manually_verified boolean NOT NULL DEFAULT false,
  manually_overridden boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, key)
);
CREATE TABLE public.guide_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, section_key)
);

GRANT SELECT, UPDATE ON public.organizations TO authenticated;
GRANT SELECT ON public.organization_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties, public.import_runs, public.property_fields, public.guide_sections TO authenticated;
GRANT ALL ON public.organizations, public.organization_members, public.properties, public.import_runs, public.property_fields, public.guide_sections TO service_role;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_sections ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = _org AND user_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.is_org_admin(_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = _org AND user_id = auth.uid() AND role IN ('owner','admin'))
$$;
CREATE OR REPLACE FUNCTION public.can_access_property(_property uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.properties p JOIN public.organization_members m ON m.organization_id = p.organization_id
                 WHERE p.id = _property AND m.user_id = auth.uid())
$$;

CREATE POLICY "members read org" ON public.organizations FOR SELECT TO authenticated USING (public.is_org_member(id));
CREATE POLICY "admins update org" ON public.organizations FOR UPDATE TO authenticated USING (public.is_org_admin(id)) WITH CHECK (public.is_org_admin(id));
CREATE POLICY "members read memberships" ON public.organization_members FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "members all properties" ON public.properties FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "members all import runs" ON public.import_runs FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "members all fields" ON public.property_fields FOR ALL TO authenticated USING (public.can_access_property(property_id)) WITH CHECK (public.can_access_property(property_id));
CREATE POLICY "members all sections" ON public.guide_sections FOR ALL TO authenticated USING (public.can_access_property(property_id)) WITH CHECK (public.can_access_property(property_id));

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER t_properties BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_fields BEFORE UPDATE ON public.property_fields FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_sections BEFORE UPDATE ON public.guide_sections FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Idempotent: creates the caller's organization + owner membership on first sign-in.
CREATE OR REPLACE FUNCTION public.ensure_my_organization(_first_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid; _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT organization_id INTO _org FROM organization_members WHERE user_id = _uid ORDER BY created_at LIMIT 1;
  IF _org IS NOT NULL THEN RETURN _org; END IF;
  INSERT INTO organizations(name) VALUES ('Conciergerie de ' || coalesce(nullif(left(trim(_first_name), 60), ''), 'moi')) RETURNING id INTO _org;
  INSERT INTO organization_members(organization_id, user_id, role) VALUES (_org, _uid, 'owner');
  RETURN _org;
END $$;
REVOKE ALL ON FUNCTION public.ensure_my_organization(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_organization(text) TO authenticated;

-- Safe public read path: only published properties, only visible sections, no org data.
CREATE OR REPLACE FUNCTION public.get_public_guide(_slug text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'name', p.name,
    'sections', coalesce((SELECT jsonb_agg(jsonb_build_object('key', s.section_key, 'title', s.title, 'content', s.content) ORDER BY s.sort_order)
                 FROM guide_sections s WHERE s.property_id = p.id AND s.is_visible), '[]'::jsonb))
  FROM properties p WHERE p.slug = _slug AND p.status = 'published'
$$;
GRANT EXECUTE ON FUNCTION public.get_public_guide(text) TO anon, authenticated;