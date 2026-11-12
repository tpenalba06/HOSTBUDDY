-- Additive service catalogue/booking preparation. Apply only to an authorized
-- target; existing financial tables, grants and commission remain unchanged.
BEGIN;
ALTER TABLE public.services ADD COLUMN booking_config jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.services ADD COLUMN property_ids uuid[];
ALTER TABLE public.services ADD COLUMN image_paths jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.services ADD COLUMN deleted_at timestamptz;
ALTER TABLE public.orders ADD COLUMN booking_details jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.orders ADD COLUMN booking_request_id uuid;
ALTER TABLE public.orders ADD COLUMN guest_receipt_hash text;
CREATE UNIQUE INDEX orders_guest_receipt_idx ON public.orders(guest_receipt_hash) WHERE guest_receipt_hash IS NOT NULL;
CREATE UNIQUE INDEX orders_booking_request_idx ON public.orders(property_id,booking_request_id) WHERE booking_request_id IS NOT NULL;

CREATE FUNCTION public.validate_service_booking_catalog() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
DECLARE target uuid; pair record; item jsonb;
BEGIN
 IF TG_OP='UPDATE' AND NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN RAISE EXCEPTION 'service organization immutable'; END IF;
 IF NEW.property_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.properties WHERE id=NEW.property_id AND organization_id=NEW.organization_id) THEN RAISE EXCEPTION 'invalid service ownership'; END IF;
 IF NEW.property_ids IS NOT NULL THEN
  IF cardinality(NEW.property_ids) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid service properties'; END IF;
  FOREACH target IN ARRAY NEW.property_ids LOOP
   IF target IS NULL OR NOT EXISTS(SELECT 1 FROM public.properties WHERE id=target AND organization_id=NEW.organization_id) THEN RAISE EXCEPTION 'invalid service ownership'; END IF;
  END LOOP;
 END IF;
 IF NEW.image_path IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.section_media WHERE organization_id=NEW.organization_id AND (NEW.property_id IS NULL OR property_id=NEW.property_id) AND storage_path=NEW.image_path AND media_type='image') THEN RAISE EXCEPTION 'invalid service photo'; END IF;
 IF jsonb_typeof(NEW.booking_config)<>'object' OR octet_length(NEW.booking_config::text)>20000 OR jsonb_typeof(NEW.image_paths)<>'object' THEN RAISE EXCEPTION 'invalid service configuration'; END IF;
 IF coalesce((NEW.booking_config->>'maxQuantity')::integer,20) NOT BETWEEN 1 AND 20 OR char_length(coalesce(NEW.booking_config->>'instructions',''))>1000 OR char_length(coalesce(NEW.booking_config->>'cancellation',''))>2000 OR char_length(coalesce(NEW.booking_config->>'seller',''))>2000 THEN RAISE EXCEPTION 'invalid service configuration'; END IF;
 IF jsonb_typeof(coalesce(NEW.booking_config->'options','[]'))<>'array' OR jsonb_array_length(coalesce(NEW.booking_config->'options','[]'))>20 OR jsonb_typeof(coalesce(NEW.booking_config->'slots','[]'))<>'array' OR jsonb_array_length(coalesce(NEW.booking_config->'slots','[]'))>100 THEN RAISE EXCEPTION 'invalid service configuration'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(coalesce(NEW.booking_config->'options','[]')) LOOP
  IF item->>'id' IS NULL OR item->>'priceCents' IS NULL THEN RAISE EXCEPTION 'invalid service option'; END IF;
  PERFORM (item->>'id')::uuid;
  IF char_length(trim(coalesce(item->>'label',''))) NOT BETWEEN 1 AND 80 OR (item->>'priceCents')::numeric NOT BETWEEN 0 AND 99999900 OR (item->>'priceCents')::numeric<>trunc((item->>'priceCents')::numeric) THEN RAISE EXCEPTION 'invalid service option'; END IF;
 END LOOP;
 FOR item IN SELECT value FROM jsonb_array_elements(coalesce(NEW.booking_config->'slots','[]')) LOOP PERFORM (item#>>'{}')::timestamptz; END LOOP;
 FOR pair IN SELECT key,value FROM jsonb_each_text(NEW.image_paths) LOOP
  IF pair.value IS NULL THEN CONTINUE; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.section_media m JOIN public.properties p ON p.id=m.property_id WHERE m.organization_id=NEW.organization_id AND p.organization_id=NEW.organization_id AND m.property_id=pair.key::uuid AND m.storage_path=pair.value AND m.media_type='image') THEN RAISE EXCEPTION 'invalid service photo'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_service_booking_catalog() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER services_booking_catalog_before_write BEFORE INSERT OR UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.validate_service_booking_catalog();

CREATE FUNCTION public.save_service_catalog(_org uuid,_property uuid,_service uuid,_values jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE current_service public.services%ROWTYPE; result public.services%ROWTYPE; targets uuid[]; target uuid;
BEGIN
 IF NOT public.is_org_admin(_org) OR NOT EXISTS(SELECT 1 FROM public.properties WHERE id=_property AND organization_id=_org) THEN RAISE EXCEPTION 'not allowed'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_service::text,23));
 SELECT * INTO current_service FROM public.services WHERE id=_service FOR UPDATE;
 IF current_service.id IS NOT NULL AND (current_service.organization_id<>_org OR current_service.deleted_at IS NOT NULL) THEN RAISE EXCEPTION 'not allowed'; END IF;
 targets:=ARRAY(SELECT value::uuid FROM jsonb_array_elements_text(_values->'property_ids'));
 IF cardinality(targets)=0 THEN RAISE EXCEPTION 'invalid service properties'; END IF;
 IF current_service.id IS NULL THEN
  INSERT INTO public.services(id,organization_id,property_id,property_ids,name,description,price,pricing_type,is_active,image_path,image_paths,booking_config)
  VALUES(_service,_org,_property,targets,_values->>'name',coalesce(_values->>'description',''),(_values->>'price')::numeric,(_values->>'pricing_type')::public.pricing_type,(_values->>'is_active')::boolean,_values->>'image_path',coalesce(_values->'image_paths','{}'),coalesce(_values->'booking_config','{}')) RETURNING * INTO result;
 ELSE
  UPDATE public.services SET property_ids=targets,name=_values->>'name',description=coalesce(_values->>'description',''),price=(_values->>'price')::numeric,pricing_type=(_values->>'pricing_type')::public.pricing_type,is_active=(_values->>'is_active')::boolean,image_path=CASE WHEN _values ? 'image_path' THEN _values->>'image_path' ELSE image_path END,image_paths=coalesce(_values->'image_paths',image_paths),booking_config=coalesce(_values->'booking_config',booking_config) WHERE id=_service RETURNING * INTO result;
 END IF;
 IF result.is_active THEN
  FOREACH target IN ARRAY targets LOOP
   INSERT INTO public.guide_sections(property_id,section_key,title,icon,sort_order,is_visible,content)
   SELECT target,'services','Services additionnels','✨',6,true,'{"items":[],"explicitlyEnabled":true}'::jsonb
   WHERE NOT EXISTS(SELECT 1 FROM public.guide_sections WHERE property_id=target AND section_key LIKE 'services%') ON CONFLICT DO NOTHING;
  END LOOP;
 END IF;
 RETURN to_jsonb(result);
END $$;
REVOKE ALL ON FUNCTION public.save_service_catalog(uuid,uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_service_catalog(uuid,uuid,uuid,jsonb) TO authenticated;

-- Published guide sections stay snapshotted. Active services form the current
-- catalogue, so deactivation and soft deletion take effect without republishing.
CREATE OR REPLACE FUNCTION public.get_public_guide(_slug text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_set(v.guide,'{services}',coalesce((SELECT jsonb_agg(jsonb_build_object(
  'id',s.id,'name',s.name,'description',s.description,'price',s.price,'pricingType',s.pricing_type,
  'imagePath',coalesce(s.image_paths->>p.id::text,CASE WHEN s.property_id=p.id THEN s.image_path END),
  'bookingConfig',s.booking_config,'revision',s.updated_at) ORDER BY s.created_at)
 FROM public.services s WHERE s.organization_id=p.organization_id AND s.is_active AND s.deleted_at IS NULL
 AND CASE WHEN s.property_ids IS NOT NULL THEN p.id=ANY(s.property_ids) ELSE s.property_id IS NULL OR s.property_id=p.id END),'[]'::jsonb))
 FROM public.properties p JOIN public.property_publications v ON v.property_id=p.id
 WHERE p.slug=_slug AND p.status='published';
$$;
REVOKE ALL ON FUNCTION public.get_public_guide(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_guide(text) TO anon,authenticated,service_role;

CREATE FUNCTION public.submit_service_booking(_slug text,_service uuid,_name text,_contact text,_quantity integer,_requested_for timestamptz,_fingerprint text,_request_id uuid,_receipt_hash text,_option uuid DEFAULT NULL,_details text DEFAULT '',_terms boolean DEFAULT false,_revision timestamptz DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.properties%ROWTYPE; s public.services%ROWTYPE; existing public.orders%ROWTYPE; oid uuid; option_row jsonb; extra numeric:=0; amount numeric; details jsonb;
BEGIN
 IF NOT _terms OR _terms IS NULL OR _request_id IS NULL OR _receipt_hash IS NULL OR _receipt_hash !~ '^[a-f0-9]{64}$' OR _quantity IS NULL OR _quantity NOT BETWEEN 1 AND 20 OR char_length(trim(coalesce(_name,''))) NOT BETWEEN 1 AND 80 OR char_length(trim(coalesce(_contact,''))) NOT BETWEEN 1 AND 160 OR char_length(coalesce(_details,''))>1000 THEN RAISE EXCEPTION 'invalid booking'; END IF;
 SELECT * INTO p FROM public.properties WHERE slug=_slug AND status='published';
 IF p.id IS NULL OR public.get_public_guide(_slug) IS NULL THEN RAISE EXCEPTION 'service unavailable'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p.id::text||_request_id::text,0));
 SELECT * INTO existing FROM public.orders WHERE property_id=p.id AND booking_request_id=_request_id;
 IF existing.id IS NOT NULL THEN
  IF existing.guest_receipt_hash<>_receipt_hash OR existing.service_id<>_service OR existing.guest_name<>trim(_name) OR existing.guest_contact<>trim(_contact) OR existing.quantity<>_quantity OR coalesce(existing.booking_details->>'optionId','')<>coalesce(_option::text,'') OR coalesce(existing.booking_details->>'details','')<>coalesce(_details,'') OR existing.requested_for IS DISTINCT FROM _requested_for THEN RAISE EXCEPTION 'booking request conflict'; END IF;
  RETURN jsonb_build_object('id',existing.id,'amount',existing.total_amount,'status',existing.status);
 END IF;
 SELECT * INTO s FROM public.services WHERE id=_service AND organization_id=p.organization_id AND is_active AND deleted_at IS NULL AND CASE WHEN property_ids IS NOT NULL THEN p.id=ANY(property_ids) ELSE property_id IS NULL OR property_id=p.id END FOR SHARE;
 IF _revision IS DISTINCT FROM s.updated_at THEN RAISE EXCEPTION 'service quote changed'; END IF;
 IF s.id IS NULL OR _quantity>coalesce((s.booking_config->>'maxQuantity')::integer,20) THEN RAISE EXCEPTION 'service unavailable'; END IF;
 IF jsonb_array_length(coalesce(s.booking_config->'options','[]'))>0 THEN
  SELECT value INTO option_row FROM jsonb_array_elements(s.booking_config->'options') WHERE value->>'id'=_option::text;
  IF option_row IS NULL THEN RAISE EXCEPTION 'service option required'; END IF;
  extra:=(option_row->>'priceCents')::numeric/100;
 ELSIF _option IS NOT NULL THEN RAISE EXCEPTION 'invalid service option'; END IF;
 IF coalesce((s.booking_config->>'requestDate')::boolean,false) AND _requested_for IS NULL THEN RAISE EXCEPTION 'booking date required'; END IF;
 IF _requested_for IS NOT NULL AND (_requested_for<now()-interval '5 minutes' OR _requested_for>now()+interval '2 years') THEN RAISE EXCEPTION 'invalid booking date'; END IF;
 IF jsonb_array_length(coalesce(s.booking_config->'slots','[]'))>0 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(s.booking_config->'slots') t WHERE t.value::timestamptz=_requested_for AND t.value::timestamptz>now()) THEN RAISE EXCEPTION 'slot unavailable'; END IF;
 amount:=(s.price+extra)*_quantity;
 IF amount>0 AND (char_length(trim(coalesce(s.booking_config->>'seller','')))=0 OR char_length(trim(coalesce(s.booking_config->>'cancellation','')))=0) THEN RAISE EXCEPTION 'service terms required'; END IF;
 IF amount>999999 OR (amount>0 AND amount<0.5) THEN RAISE EXCEPTION 'invalid booking amount'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(coalesce(_fingerprint,''),0));
 IF (SELECT count(*) FROM public.public_submission_rate_limits WHERE fingerprint=_fingerprint AND submission_type='order' AND created_at>now()-interval '1 hour')>=4 THEN RAISE EXCEPTION 'rate limited'; END IF;
 INSERT INTO public.public_submission_rate_limits(fingerprint,submission_type) VALUES(_fingerprint,'order');
 details:=jsonb_build_object('serviceName',s.name,'optionId',_option,'optionLabel',option_row->>'label','details',coalesce(_details,''),'cancellation',coalesce(s.booking_config->>'cancellation',''),'seller',coalesce(s.booking_config->>'seller',''),'termsAcceptedAt',now());
 INSERT INTO public.orders(organization_id,property_id,service_id,guest_name,guest_contact,quantity,total_amount,requested_for,booking_details,booking_request_id,guest_receipt_hash)
 VALUES(p.organization_id,p.id,s.id,trim(_name),trim(_contact),_quantity,amount,_requested_for,details,_request_id,_receipt_hash) RETURNING id INTO oid;
 RETURN jsonb_build_object('id',oid,'amount',amount,'status','pending');
END $$;
REVOKE ALL ON FUNCTION public.submit_service_booking(text,uuid,text,text,integer,timestamptz,text,uuid,text,uuid,text,boolean,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_service_booking(text,uuid,text,text,integer,timestamptz,text,uuid,text,uuid,text,boolean,timestamptz) TO service_role;

CREATE FUNCTION public.read_service_booking(_order uuid,_receipt_hash text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('id',o.id,'status',o.status,'amount',o.total_amount,'requestedFor',o.requested_for,'serviceName',o.booking_details->>'serviceName','optionLabel',o.booking_details->>'optionLabel','paymentStatus',(SELECT status FROM public.order_payments WHERE order_id=o.id),'cancellation',o.booking_details->>'cancellation','seller',o.booking_details->>'seller') FROM public.orders o WHERE o.id=_order AND o.guest_receipt_hash=_receipt_hash AND o.created_at>now()-interval '30 days' AND _receipt_hash ~ '^[a-f0-9]{64}$';
$$;
REVOKE ALL ON FUNCTION public.read_service_booking(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_service_booking(uuid,text) TO service_role;
CREATE FUNCTION public.read_service_booking_request(_request uuid,_receipt_hash text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.read_service_booking(id,_receipt_hash) FROM public.orders WHERE booking_request_id=_request AND guest_receipt_hash=_receipt_hash;
$$;
REVOKE ALL ON FUNCTION public.read_service_booking_request(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_service_booking_request(uuid,text) TO service_role;
CREATE FUNCTION public.guard_paid_service_completion() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status='completed' AND OLD.status<>'completed' AND NEW.total_amount>0 AND NEW.booking_request_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.order_payments WHERE order_id=NEW.id AND organization_id=NEW.organization_id AND status IN('paid','partially_refunded')) THEN RAISE EXCEPTION 'service payment pending'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_paid_service_completion() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER orders_paid_service_completion BEFORE UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.guard_paid_service_completion();
CREATE FUNCTION public.service_order_payment_states(_org uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_org_member(_org) THEN RAISE EXCEPTION 'not allowed'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',o.id,'status',pay.status)) FROM public.orders o JOIN public.order_payments pay ON pay.order_id=o.id AND pay.organization_id=o.organization_id WHERE o.organization_id=_org),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.service_order_payment_states(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.service_order_payment_states(uuid) TO authenticated;
COMMIT;
