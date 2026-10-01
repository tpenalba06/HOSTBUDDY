CREATE TABLE public.section_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.guide_sections(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('image','video')),
  storage_path text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  file_size bigint NOT NULL CHECK (file_size > 0 AND file_size <= 52428800),
  caption text,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.section_media TO authenticated;
GRANT ALL ON public.section_media TO service_role;
ALTER TABLE public.section_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage section media" ON public.section_media FOR ALL TO authenticated
USING (public.is_org_member(organization_id) AND public.can_access_property(property_id))
WITH CHECK (public.is_org_member(organization_id) AND public.can_access_property(property_id));
CREATE TRIGGER t_section_media BEFORE UPDATE ON public.section_media FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.property_messaging_settings (
  property_id uuid PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_messaging_settings TO authenticated;
GRANT ALL ON public.property_messaging_settings TO service_role;
ALTER TABLE public.property_messaging_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage messaging settings" ON public.property_messaging_settings FOR ALL TO authenticated
USING (public.can_access_property(property_id)) WITH CHECK (public.can_access_property(property_id));
CREATE TRIGGER t_property_messaging_settings BEFORE UPDATE ON public.property_messaging_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  guest_display_name text NOT NULL,
  guest_contact text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage conversations" ON public.conversations FOR ALL TO authenticated
USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));
CREATE INDEX conversations_org_last_idx ON public.conversations(organization_id, last_message_at DESC);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('guest','manager')),
  sender_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read conversation messages" ON public.messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND public.is_org_member(c.organization_id)));
CREATE POLICY "members send manager messages" ON public.messages FOR INSERT TO authenticated
WITH CHECK (sender_type = 'manager' AND sender_user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND public.is_org_member(c.organization_id)));
CREATE POLICY "members update message reads" ON public.messages FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND public.is_org_member(c.organization_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND public.is_org_member(c.organization_id)));
CREATE INDEX messages_conversation_created_idx ON public.messages(conversation_id, created_at);

CREATE TABLE public.guest_message_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.guest_message_rate_limits TO service_role;
ALTER TABLE public.guest_message_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE INDEX guest_message_rate_idx ON public.guest_message_rate_limits(fingerprint, created_at DESC);

CREATE OR REPLACE FUNCTION public.submit_guest_message(_slug text, _name text, _contact text, _body text, _fingerprint text, _website text DEFAULT '')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _property public.properties%ROWTYPE; _conversation uuid;
BEGIN
  IF coalesce(_website, '') <> '' THEN RAISE EXCEPTION 'invalid submission'; END IF;
  IF char_length(trim(coalesce(_name,''))) NOT BETWEEN 1 AND 80 OR char_length(trim(coalesce(_body,''))) NOT BETWEEN 1 AND 2000 OR char_length(trim(coalesce(_contact,''))) > 160 THEN RAISE EXCEPTION 'invalid submission'; END IF;
  SELECT p.* INTO _property FROM public.properties p
  LEFT JOIN public.property_messaging_settings s ON s.property_id = p.id
  WHERE p.slug = _slug AND p.status = 'published' AND coalesce(s.is_enabled, true) = true;
  IF _property.id IS NULL THEN RAISE EXCEPTION 'messaging unavailable'; END IF;
  IF (SELECT count(*) FROM public.guest_message_rate_limits WHERE fingerprint = _fingerprint AND created_at > now() - interval '1 hour') >= 4 THEN RAISE EXCEPTION 'rate limited'; END IF;
  INSERT INTO public.guest_message_rate_limits(fingerprint) VALUES (_fingerprint);
  SELECT c.id INTO _conversation FROM public.conversations c
  WHERE c.property_id = _property.id AND c.status = 'open' AND lower(c.guest_display_name) = lower(trim(_name)) AND coalesce(c.guest_contact,'') = trim(coalesce(_contact,''))
  ORDER BY c.last_message_at DESC LIMIT 1;
  IF _conversation IS NULL THEN
    INSERT INTO public.conversations(organization_id, property_id, guest_display_name, guest_contact)
    VALUES (_property.organization_id, _property.id, trim(_name), nullif(trim(coalesce(_contact,'')), '')) RETURNING id INTO _conversation;
  ELSE
    UPDATE public.conversations SET last_message_at = now() WHERE id = _conversation;
  END IF;
  INSERT INTO public.messages(conversation_id, sender_type, body) VALUES (_conversation, 'guest', trim(_body));
  RETURN _conversation;
END $$;
REVOKE ALL ON FUNCTION public.submit_guest_message(text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_guest_message(text,text,text,text,text,text) TO anon, authenticated;

CREATE POLICY "members upload guide media" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'guide-media' AND public.is_org_member(((storage.foldername(name))[1])::uuid) AND public.can_access_property(((storage.foldername(name))[2])::uuid));
CREATE POLICY "members read guide media" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'guide-media' AND public.is_org_member(((storage.foldername(name))[1])::uuid) AND public.can_access_property(((storage.foldername(name))[2])::uuid));
CREATE POLICY "members update guide media" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'guide-media' AND public.is_org_member(((storage.foldername(name))[1])::uuid) AND public.can_access_property(((storage.foldername(name))[2])::uuid))
WITH CHECK (bucket_id = 'guide-media' AND public.is_org_member(((storage.foldername(name))[1])::uuid) AND public.can_access_property(((storage.foldername(name))[2])::uuid));
CREATE POLICY "members delete guide media" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'guide-media' AND public.is_org_member(((storage.foldername(name))[1])::uuid) AND public.can_access_property(((storage.foldername(name))[2])::uuid));

CREATE OR REPLACE FUNCTION public.get_public_guide(_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'originalLocale', p.original_locale,
    'accommodationType', p.accommodation_type,
    'messagingEnabled', coalesce((SELECT s.is_enabled FROM public.property_messaging_settings s WHERE s.property_id = p.id), true),
    'sections', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id, 'key', s.section_key, 'title', s.title, 'content', s.content,
        'media', coalesce((SELECT jsonb_agg(jsonb_build_object('id', m.id, 'type', m.media_type, 'path', m.storage_path, 'mimeType', m.mime_type, 'caption', m.caption, 'altText', m.alt_text, 'sortOrder', m.sort_order) ORDER BY m.sort_order) FROM public.section_media m WHERE m.section_id = s.id), '[]'::jsonb),
        'translations', coalesce((SELECT jsonb_agg(jsonb_build_object('locale', t.locale, 'title', t.title, 'content', t.content, 'sourceType', t.source_type, 'isStale', t.is_stale)) FROM public.guide_section_translations t WHERE t.section_id = s.id AND t.is_stale = false), '[]'::jsonb)
      ) ORDER BY s.sort_order) FROM public.guide_sections s WHERE s.property_id = p.id AND s.is_visible
    ), '[]'::jsonb),
    'review', (SELECT jsonb_build_object('title', r.title, 'message', r.message, 'destinations', coalesce((SELECT jsonb_agg(jsonb_build_object('label', d.label, 'url', d.url) ORDER BY d.sort_order) FROM public.property_review_destinations d WHERE d.property_id = p.id AND d.is_enabled), '[]'::jsonb)) FROM public.property_review_settings r WHERE r.property_id = p.id AND r.is_enabled)
  ) FROM public.properties p WHERE p.slug = _slug AND p.status = 'published'
$$;