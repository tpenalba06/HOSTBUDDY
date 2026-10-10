-- Public requests use the price actually shown in the published snapshot.
-- Rollback: restore the former submit_guest_order body; keep restricted grants.
CREATE OR REPLACE FUNCTION public.submit_guest_order(_slug text, _service uuid, _name text, _contact text, _quantity integer, _requested_for timestamp with time zone, _fingerprint text, _website text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _property public.properties%ROWTYPE; _service_row public.services%ROWTYPE; _order uuid; _published_service jsonb;
BEGIN
  IF coalesce(_website, '') <> '' THEN RAISE EXCEPTION 'invalid submission'; END IF;
  IF char_length(trim(coalesce(_name,''))) NOT BETWEEN 1 AND 80 OR char_length(trim(coalesce(_contact,''))) > 160 OR _quantity NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'invalid submission'; END IF;
  SELECT * INTO _property FROM public.properties WHERE slug = _slug AND status = 'published';
  SELECT * INTO _service_row FROM public.services WHERE id = _service AND is_active = true AND organization_id = _property.organization_id AND (property_id IS NULL OR property_id = _property.id);
  SELECT value INTO _published_service FROM jsonb_array_elements(public.get_public_guide(_slug)->'services') WHERE value->>'id'=_service::text;
  IF _property.id IS NULL OR _service_row.id IS NULL OR _published_service IS NULL THEN RAISE EXCEPTION 'service unavailable'; END IF;
  IF (SELECT count(*) FROM public.public_submission_rate_limits WHERE fingerprint = _fingerprint AND submission_type = 'order' AND created_at > now() - interval '1 hour') >= 4 THEN RAISE EXCEPTION 'rate limited'; END IF;
  INSERT INTO public.public_submission_rate_limits(fingerprint, submission_type) VALUES (_fingerprint, 'order');
  INSERT INTO public.orders(organization_id, property_id, service_id, guest_name, guest_contact, quantity, total_amount, requested_for) VALUES (_property.organization_id, _property.id, _service_row.id, trim(_name), nullif(trim(coalesce(_contact,'')), ''), _quantity, (_published_service->>'price')::numeric * _quantity, _requested_for) RETURNING id INTO _order;
  RETURN _order;
END $function$
;
