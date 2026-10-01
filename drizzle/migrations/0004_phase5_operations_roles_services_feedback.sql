CREATE TYPE public.pricing_type AS ENUM ('fixed','per_person');
CREATE TYPE public.order_status AS ENUM ('pending','confirmed','completed','cancelled');

ALTER TABLE public.guide_sections ADD COLUMN icon text NOT NULL DEFAULT '📌';
ALTER TABLE public.guide_sections ADD COLUMN cta_label text;

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  pricing_type public.pricing_type NOT NULL DEFAULT 'fixed',
  is_active boolean NOT NULL DEFAULT true,
  image_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read services" ON public.services FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "admins manage services" ON public.services FOR ALL TO authenticated USING (public.is_org_admin(organization_id)) WITH CHECK (public.is_org_admin(organization_id) AND (property_id IS NULL OR public.can_access_property(property_id)));
CREATE INDEX services_org_property_idx ON public.services(organization_id, property_id, is_active);
CREATE TRIGGER t_services BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  guest_name text,
  guest_contact text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 100),
  total_amount numeric(10,2) NOT NULL CHECK (total_amount >= 0),
  requested_for timestamptz,
  status public.order_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage orders" ON public.orders FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id) AND public.can_access_property(property_id));
CREATE INDEX orders_org_requested_idx ON public.orders(organization_id, requested_for, created_at DESC);
CREATE TRIGGER t_orders BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.guest_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  guest_name text,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '' CHECK (char_length(comment) <= 2000),
  is_read boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','archived')),
  manager_note text CHECK (char_length(manager_note) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.guest_feedback TO authenticated;
GRANT ALL ON public.guest_feedback TO service_role;
ALTER TABLE public.guest_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage feedback" ON public.guest_feedback FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id) AND public.can_access_property(property_id));
CREATE INDEX guest_feedback_org_created_idx ON public.guest_feedback(organization_id, created_at DESC);
CREATE TRIGGER t_guest_feedback BEFORE UPDATE ON public.guest_feedback FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.org_role NOT NULL DEFAULT 'member',
  invited_by uuid NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_invitations TO authenticated;
GRANT ALL ON public.organization_invitations TO service_role;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage invitations" ON public.organization_invitations FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = organization_invitations.organization_id AND m.user_id = auth.uid() AND m.role = 'owner')) WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = organization_invitations.organization_id AND m.user_id = auth.uid() AND m.role = 'owner'));

CREATE TABLE public.public_submission_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL,
  submission_type text NOT NULL CHECK (submission_type IN ('order','feedback')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.public_submission_rate_limits TO service_role;
ALTER TABLE public.public_submission_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE INDEX public_submission_rate_idx ON public.public_submission_rate_limits(fingerprint, submission_type, created_at DESC);

CREATE OR REPLACE FUNCTION public.is_org_owner(_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = _org AND user_id = auth.uid() AND role = 'owner')
$$;
REVOKE ALL ON FUNCTION public.is_org_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_owner(uuid) TO authenticated;

DROP POLICY "members all properties" ON public.properties;
CREATE POLICY "members read properties" ON public.properties FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "admins create properties" ON public.properties FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "admins update properties" ON public.properties FOR UPDATE TO authenticated USING (public.is_org_admin(organization_id)) WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "admins delete properties" ON public.properties FOR DELETE TO authenticated USING (public.is_org_admin(organization_id));

DROP POLICY "members all fields" ON public.property_fields;
CREATE POLICY "members read fields" ON public.property_fields FOR SELECT TO authenticated USING (public.can_access_property(property_id));
CREATE POLICY "admins create fields" ON public.property_fields FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND public.is_org_admin(p.organization_id)));
CREATE POLICY "admins update fields" ON public.property_fields FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND public.is_org_admin(p.organization_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND public.is_org_admin(p.organization_id)));
CREATE POLICY "admins delete fields" ON public.property_fields FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND public.is_org_admin(p.organization_id)));

DROP POLICY "members all sections" ON public.guide_sections;
CREATE POLICY "members read sections" ON public.guide_sections FOR SELECT TO authenticated USING (public.can_access_property(property_id));
CREATE POLICY "admins create sections" ON public.guide_sections FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND public.is_org_admin(p.organization_id)));
CREATE POLICY "admins update sections" ON public.guide_sections FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND public.is_org_admin(p.organization_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND public.is_org_admin(p.organization_id)));
CREATE POLICY "admins delete sections" ON public.guide_sections FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND public.is_org_admin(p.organization_id)));

DROP POLICY "members manage section media" ON public.section_media;
CREATE POLICY "members read section media" ON public.section_media FOR SELECT TO authenticated USING (public.is_org_member(organization_id) AND public.can_access_property(property_id));
CREATE POLICY "admins create section media" ON public.section_media FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(organization_id) AND public.can_access_property(property_id));
CREATE POLICY "admins update section media" ON public.section_media FOR UPDATE TO authenticated USING (public.is_org_admin(organization_id) AND public.can_access_property(property_id)) WITH CHECK (public.is_org_admin(organization_id) AND public.can_access_property(property_id));
CREATE POLICY "admins delete section media" ON public.section_media FOR DELETE TO authenticated USING (public.is_org_admin(organization_id) AND public.can_access_property(property_id));

DROP POLICY "members manage messaging settings" ON public.property_messaging_settings;
CREATE POLICY "members read messaging settings" ON public.property_messaging_settings FOR SELECT TO authenticated USING (public.can_access_property(property_id));
CREATE POLICY "admins manage messaging settings" ON public.property_messaging_settings FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND public.is_org_admin(p.organization_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND public.is_org_admin(p.organization_id)));

DROP POLICY "members all review settings" ON public.property_review_settings;
CREATE POLICY "members read review settings" ON public.property_review_settings FOR SELECT TO authenticated USING (public.can_access_property(property_id));
CREATE POLICY "admins manage review settings" ON public.property_review_settings FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND public.is_org_admin(p.organization_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND public.is_org_admin(p.organization_id)));

DROP POLICY "members all review destinations" ON public.property_review_destinations;
CREATE POLICY "members read review destinations" ON public.property_review_destinations FOR SELECT TO authenticated USING (public.can_access_property(property_id));
CREATE POLICY "admins manage review destinations" ON public.property_review_destinations FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND public.is_org_admin(p.organization_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND public.is_org_admin(p.organization_id)));

DROP POLICY "members upload guide media" ON storage.objects;
DROP POLICY "members update guide media" ON storage.objects;
DROP POLICY "members delete guide media" ON storage.objects;
CREATE POLICY "admins upload guide media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'guide-media' AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/' AND public.is_org_admin(((storage.foldername(name))[1])::uuid) AND public.can_access_property(((storage.foldername(name))[2])::uuid));
CREATE POLICY "admins update guide media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'guide-media' AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/' AND public.is_org_admin(((storage.foldername(name))[1])::uuid) AND public.can_access_property(((storage.foldername(name))[2])::uuid)) WITH CHECK (bucket_id = 'guide-media' AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/' AND public.is_org_admin(((storage.foldername(name))[1])::uuid) AND public.can_access_property(((storage.foldername(name))[2])::uuid));
CREATE POLICY "admins delete guide media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'guide-media' AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/' AND public.is_org_admin(((storage.foldername(name))[1])::uuid) AND public.can_access_property(((storage.foldername(name))[2])::uuid));

CREATE OR REPLACE FUNCTION public.validate_service_ownership()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.property_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.properties p WHERE p.id = NEW.property_id AND p.organization_id = NEW.organization_id) THEN RAISE EXCEPTION 'invalid service ownership'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_service_ownership_before_write BEFORE INSERT OR UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.validate_service_ownership();

CREATE OR REPLACE FUNCTION public.validate_order_ownership()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.properties p JOIN public.services s ON s.id = NEW.service_id WHERE p.id = NEW.property_id AND p.organization_id = NEW.organization_id AND s.organization_id = NEW.organization_id AND (s.property_id IS NULL OR s.property_id = NEW.property_id)) THEN RAISE EXCEPTION 'invalid order ownership'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_order_ownership_before_write BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.validate_order_ownership();

CREATE OR REPLACE FUNCTION public.validate_feedback_ownership()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.properties p WHERE p.id = NEW.property_id AND p.organization_id = NEW.organization_id) THEN RAISE EXCEPTION 'invalid feedback ownership'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_feedback_ownership_before_write BEFORE INSERT OR UPDATE ON public.guest_feedback FOR EACH ROW EXECUTE FUNCTION public.validate_feedback_ownership();

CREATE OR REPLACE FUNCTION public.submit_guest_order(_slug text, _service uuid, _name text, _contact text, _quantity integer, _requested_for timestamptz, _fingerprint text, _website text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _property public.properties%ROWTYPE; _service_row public.services%ROWTYPE; _order uuid;
BEGIN
  IF coalesce(_website, '') <> '' THEN RAISE EXCEPTION 'invalid submission'; END IF;
  IF char_length(trim(coalesce(_name,''))) NOT BETWEEN 1 AND 80 OR char_length(trim(coalesce(_contact,''))) > 160 OR _quantity NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'invalid submission'; END IF;
  SELECT * INTO _property FROM public.properties WHERE slug = _slug AND status = 'published';
  SELECT * INTO _service_row FROM public.services WHERE id = _service AND is_active = true AND organization_id = _property.organization_id AND (property_id IS NULL OR property_id = _property.id);
  IF _property.id IS NULL OR _service_row.id IS NULL THEN RAISE EXCEPTION 'service unavailable'; END IF;
  IF (SELECT count(*) FROM public.public_submission_rate_limits WHERE fingerprint = _fingerprint AND submission_type = 'order' AND created_at > now() - interval '1 hour') >= 4 THEN RAISE EXCEPTION 'rate limited'; END IF;
  INSERT INTO public.public_submission_rate_limits(fingerprint, submission_type) VALUES (_fingerprint, 'order');
  INSERT INTO public.orders(organization_id, property_id, service_id, guest_name, guest_contact, quantity, total_amount, requested_for) VALUES (_property.organization_id, _property.id, _service_row.id, trim(_name), nullif(trim(coalesce(_contact,'')), ''), _quantity, _service_row.price * _quantity, _requested_for) RETURNING id INTO _order;
  RETURN _order;
END $$;
REVOKE ALL ON FUNCTION public.submit_guest_order(text,uuid,text,text,integer,timestamptz,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_guest_order(text,uuid,text,text,integer,timestamptz,text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_guest_feedback(_slug text, _name text, _rating integer, _comment text, _fingerprint text, _website text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _property public.properties%ROWTYPE; _feedback uuid;
BEGIN
  IF coalesce(_website, '') <> '' THEN RAISE EXCEPTION 'invalid submission'; END IF;
  IF char_length(trim(coalesce(_name,''))) > 80 OR _rating NOT BETWEEN 1 AND 5 OR char_length(trim(coalesce(_comment,''))) > 2000 THEN RAISE EXCEPTION 'invalid submission'; END IF;
  SELECT * INTO _property FROM public.properties WHERE slug = _slug AND status = 'published';
  IF _property.id IS NULL THEN RAISE EXCEPTION 'guide unavailable'; END IF;
  IF (SELECT count(*) FROM public.public_submission_rate_limits WHERE fingerprint = _fingerprint AND submission_type = 'feedback' AND created_at > now() - interval '24 hours') >= 2 THEN RAISE EXCEPTION 'rate limited'; END IF;
  INSERT INTO public.public_submission_rate_limits(fingerprint, submission_type) VALUES (_fingerprint, 'feedback');
  INSERT INTO public.guest_feedback(organization_id, property_id, guest_name, rating, comment) VALUES (_property.organization_id, _property.id, nullif(trim(coalesce(_name,'')), ''), _rating, trim(coalesce(_comment,''))) RETURNING id INTO _feedback;
  RETURN _feedback;
END $$;
REVOKE ALL ON FUNCTION public.submit_guest_feedback(text,text,integer,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_guest_feedback(text,text,integer,text,text,text) TO anon, authenticated;

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

CREATE OR REPLACE FUNCTION public.get_public_guide(_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'id', p.id, 'name', p.name, 'originalLocale', p.original_locale, 'accommodationType', p.accommodation_type,
    'messagingEnabled', coalesce((SELECT s.is_enabled FROM public.property_messaging_settings s WHERE s.property_id = p.id), false),
    'sections', coalesce((SELECT jsonb_agg(jsonb_build_object('id', s.id, 'key', s.section_key, 'icon', s.icon, 'title', s.title, 'ctaLabel', s.cta_label, 'content', s.content, 'media', coalesce((SELECT jsonb_agg(jsonb_build_object('id', m.id, 'type', m.media_type, 'path', m.storage_path, 'mimeType', m.mime_type, 'caption', m.caption, 'altText', m.alt_text, 'sortOrder', m.sort_order) ORDER BY m.sort_order) FROM public.section_media m WHERE m.section_id = s.id), '[]'::jsonb), 'translations', coalesce((SELECT jsonb_agg(jsonb_build_object('locale', t.locale, 'title', t.title, 'content', t.content, 'sourceType', t.source_type, 'isStale', t.is_stale)) FROM public.guide_section_translations t WHERE t.section_id = s.id AND t.is_stale = false), '[]'::jsonb)) ORDER BY s.sort_order) FROM public.guide_sections s WHERE s.property_id = p.id AND s.is_visible), '[]'::jsonb),
    'services', coalesce((SELECT jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'description', x.description, 'price', x.price, 'pricingType', x.pricing_type, 'imagePath', x.image_path) ORDER BY x.created_at) FROM public.services x WHERE x.organization_id = p.organization_id AND x.is_active AND (x.property_id IS NULL OR x.property_id = p.id)), '[]'::jsonb),
    'review', (SELECT jsonb_build_object('title', r.title, 'message', r.message, 'destinations', coalesce((SELECT jsonb_agg(jsonb_build_object('label', d.label, 'url', d.url) ORDER BY d.sort_order) FROM public.property_review_destinations d WHERE d.property_id = p.id AND d.is_enabled), '[]'::jsonb)) FROM public.property_review_settings r WHERE r.property_id = p.id AND r.is_enabled)
  ) FROM public.properties p WHERE p.slug = _slug AND p.status = 'published'
$$;