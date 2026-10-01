CREATE OR REPLACE FUNCTION public.validate_section_media_ownership()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.guide_sections s
    JOIN public.properties p ON p.id = s.property_id
    WHERE s.id = NEW.section_id
      AND s.property_id = NEW.property_id
      AND p.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'invalid media ownership';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER validate_section_media_ownership_before_write
BEFORE INSERT OR UPDATE ON public.section_media
FOR EACH ROW EXECUTE FUNCTION public.validate_section_media_ownership();

CREATE OR REPLACE FUNCTION public.validate_conversation_ownership()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = NEW.property_id AND p.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'invalid conversation ownership';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER validate_conversation_ownership_before_write
BEFORE INSERT OR UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.validate_conversation_ownership();

ALTER TABLE public.property_messaging_settings ALTER COLUMN is_enabled SET DEFAULT false;

DROP POLICY "members upload guide media" ON storage.objects;
DROP POLICY "members read guide media" ON storage.objects;
DROP POLICY "members update guide media" ON storage.objects;
DROP POLICY "members delete guide media" ON storage.objects;

CREATE POLICY "members upload guide media" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'guide-media' AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/' AND public.is_org_member(((storage.foldername(name))[1])::uuid) AND public.can_access_property(((storage.foldername(name))[2])::uuid));
CREATE POLICY "members read guide media" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'guide-media' AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/' AND public.is_org_member(((storage.foldername(name))[1])::uuid) AND public.can_access_property(((storage.foldername(name))[2])::uuid));
CREATE POLICY "members update guide media" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'guide-media' AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/' AND public.is_org_member(((storage.foldername(name))[1])::uuid) AND public.can_access_property(((storage.foldername(name))[2])::uuid))
WITH CHECK (bucket_id = 'guide-media' AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/' AND public.is_org_member(((storage.foldername(name))[1])::uuid) AND public.can_access_property(((storage.foldername(name))[2])::uuid));
CREATE POLICY "members delete guide media" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'guide-media' AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/' AND public.is_org_member(((storage.foldername(name))[1])::uuid) AND public.can_access_property(((storage.foldername(name))[2])::uuid));

CREATE OR REPLACE FUNCTION public.get_public_guide(_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'originalLocale', p.original_locale,
    'accommodationType', p.accommodation_type,
    'messagingEnabled', coalesce((SELECT s.is_enabled FROM public.property_messaging_settings s WHERE s.property_id = p.id), false),
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
  JOIN public.property_messaging_settings s ON s.property_id = p.id AND s.is_enabled = true
  WHERE p.slug = _slug AND p.status = 'published';
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