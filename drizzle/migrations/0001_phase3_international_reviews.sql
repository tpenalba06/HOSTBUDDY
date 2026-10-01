ALTER TABLE public.properties
  ADD COLUMN accommodation_type text,
  ADD COLUMN original_locale text NOT NULL DEFAULT 'fr';

ALTER TABLE public.organizations
  ADD COLUMN operator_type text,
  ADD COLUMN preferred_locale text NOT NULL DEFAULT 'fr';

CREATE TABLE public.property_review_settings (
  property_id uuid PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Votre séjour vous a plu ?',
  message text NOT NULL DEFAULT 'Partagez votre expérience sur la plateforme de votre choix.',
  is_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_review_settings TO authenticated;
GRANT ALL ON public.property_review_settings TO service_role;
ALTER TABLE public.property_review_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members all review settings" ON public.property_review_settings
  FOR ALL TO authenticated
  USING (public.can_access_property(property_id))
  WITH CHECK (public.can_access_property(property_id));
CREATE TRIGGER t_review_settings BEFORE UPDATE ON public.property_review_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.property_review_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  label text NOT NULL,
  url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.property_review_destinations(property_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_review_destinations TO authenticated;
GRANT ALL ON public.property_review_destinations TO service_role;
ALTER TABLE public.property_review_destinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members all review destinations" ON public.property_review_destinations
  FOR ALL TO authenticated
  USING (public.can_access_property(property_id))
  WITH CHECK (public.can_access_property(property_id));
CREATE TRIGGER t_review_destinations BEFORE UPDATE ON public.property_review_destinations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.guide_section_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.guide_sections(id) ON DELETE CASCADE,
  locale text NOT NULL,
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_type text NOT NULL DEFAULT 'machine',
  is_stale boolean NOT NULL DEFAULT false,
  source_updated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(section_id, locale)
);
CREATE INDEX ON public.guide_section_translations(section_id, locale);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_section_translations TO authenticated;
GRANT ALL ON public.guide_section_translations TO service_role;
ALTER TABLE public.guide_section_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members all guide translations" ON public.guide_section_translations
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.guide_sections s
    WHERE s.id = section_id AND public.can_access_property(s.property_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.guide_sections s
    WHERE s.id = section_id AND public.can_access_property(s.property_id)
  ));
CREATE TRIGGER t_guide_translations BEFORE UPDATE ON public.guide_section_translations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.mark_section_machine_translations_stale()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.title IS DISTINCT FROM NEW.title OR OLD.content IS DISTINCT FROM NEW.content THEN
    UPDATE public.guide_section_translations
      SET is_stale = true
      WHERE section_id = NEW.id AND source_type = 'machine';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER t_mark_section_translations_stale
  AFTER UPDATE OF title, content ON public.guide_sections
  FOR EACH ROW EXECUTE FUNCTION public.mark_section_machine_translations_stale();

CREATE OR REPLACE FUNCTION public.get_public_guide(_slug text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'name', p.name,
    'originalLocale', p.original_locale,
    'accommodationType', p.accommodation_type,
    'sections', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'key', s.section_key,
          'title', s.title,
          'content', s.content,
          'translations', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
              'locale', t.locale,
              'title', t.title,
              'content', t.content,
              'sourceType', t.source_type,
              'isStale', t.is_stale
            ))
            FROM public.guide_section_translations t
            WHERE t.section_id = s.id AND t.is_stale = false
          ), '[]'::jsonb)
        ) ORDER BY s.sort_order
      )
      FROM public.guide_sections s
      WHERE s.property_id = p.id AND s.is_visible
    ), '[]'::jsonb),
    'review', (
      SELECT jsonb_build_object(
        'title', r.title,
        'message', r.message,
        'destinations', coalesce((
          SELECT jsonb_agg(jsonb_build_object('label', d.label, 'url', d.url) ORDER BY d.sort_order)
          FROM public.property_review_destinations d
          WHERE d.property_id = p.id AND d.is_enabled
        ), '[]'::jsonb)
      )
      FROM public.property_review_settings r
      WHERE r.property_id = p.id AND r.is_enabled
    )
  )
  FROM public.properties p
  WHERE p.slug = _slug AND p.status = 'published'
$$;
REVOKE ALL ON FUNCTION public.get_public_guide(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_guide(text) TO anon, authenticated;