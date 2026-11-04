-- Run in the same transaction as 0019 for preflight, then roll back all fixtures.
BEGIN;
DO $$
DECLARE org uuid:=gen_random_uuid(); other_org uuid:=gen_random_uuid();
 uid uuid:=gen_random_uuid(); p1 uuid:=gen_random_uuid(); p2 uuid:=gen_random_uuid();
 p3 uuid:=gen_random_uuid(); cover uuid:=gen_random_uuid(); welcome uuid:=gen_random_uuid(); rejected boolean; grace timestamptz;
BEGIN
 INSERT INTO public.organizations(id,name) VALUES(org,'HB paywall rollback fixture'),(other_org,'HB other tenant fixture');
 INSERT INTO public.organization_members(organization_id,user_id,role) VALUES(org,uid,'owner');
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);
 INSERT INTO public.properties(id,organization_id,name,slug) VALUES(p1,org,'HB free','hb-paywall-'||p1);
 UPDATE public.properties SET created_at=now()-interval '1 hour' WHERE id=p1;
 INSERT INTO public.guide_sections(id,property_id,section_key,title,content,sort_order)
 VALUES(welcome,p1,'welcome','Hello',jsonb_build_object('items',jsonb_build_array(jsonb_build_object('label','', 'text','P0 published content')),'propertyMedia',jsonb_build_object('version',1,'coverId',cover)),0);
 INSERT INTO public.guide_sections(property_id,section_key,title,content,sort_order)
 VALUES(p1,'wifi','Wi-Fi','{"items":[{"label":"Network","text":"P0 network"}]}'::jsonb,20),
 (p1,'arrival','Arrival','{"items":[{"label":"Check-in","text":"15:00"}]}'::jsonb,10),
 (p1,'private','Hidden content','{}',30);
 UPDATE public.guide_sections SET is_visible=false WHERE property_id=p1 AND section_key='private';
 INSERT INTO public.section_media(id,organization_id,property_id,section_id,media_type,storage_path,mime_type,file_size)
 VALUES(cover,org,p1,welcome,'image',org||'/'||p1||'/'||welcome||'/cover.jpg','image/jpeg',100);
 PERFORM public.publish_property(p1);
 IF public.get_public_guide('hb-paywall-'||p1) IS NULL THEN RAISE EXCEPTION 'free guide denied'; END IF;
 INSERT INTO public.properties(id,organization_id,name,slug) VALUES(p2,org,'HB draft','hb-paywall-'||p2);
 INSERT INTO public.guide_sections(property_id,section_key,title) VALUES(p2,'welcome','Hello');
 rejected:=false;
 BEGIN PERFORM public.publish_property(p2); EXCEPTION WHEN SQLSTATE 'P0001' THEN rejected:=SQLERRM='hb_subscription_required'; END;
 IF NOT rejected THEN RAISE EXCEPTION 'unpaid RPC bypass'; END IF;
 IF public.get_public_guide('hb-paywall-'||p1) IS NULL THEN RAISE EXCEPTION 'second draft hid free guide'; END IF;
 IF public.get_public_guide('hb-paywall-'||p2) IS NOT NULL THEN RAISE EXCEPTION 'rejected draft is public'; END IF;
 rejected:=false;
 BEGIN UPDATE public.properties SET status='published' WHERE id=p2; EXCEPTION WHEN SQLSTATE 'P0001' THEN rejected:=SQLERRM='hb_subscription_required'; END;
 IF NOT rejected THEN RAISE EXCEPTION 'direct REST bypass'; END IF;
 INSERT INTO public.organization_payment_accounts(organization_id,stripe_subscription_id,subscription_status,current_period_end)
 VALUES(other_org,'sub_other_fixture','active',now()+interval '1 month');
 IF public.has_paid_publication_access(org) THEN RAISE EXCEPTION 'other tenant subscription reused'; END IF;
 INSERT INTO public.organization_payment_accounts(organization_id,stripe_subscription_id,subscription_status,current_period_end)
 VALUES(org,'sub_gate_fixture','incomplete',now()+interval '1 month');
 IF public.has_paid_publication_access(org) THEN RAISE EXCEPTION 'incomplete access'; END IF;
 UPDATE public.organization_payment_accounts SET subscription_status='active' WHERE organization_id=org;
 rejected:=false;
 BEGIN PERFORM public.publish_property(p2); EXCEPTION WHEN SQLSTATE 'P0001' THEN rejected:=SQLERRM='hb_billing_sync_required'; END;
 IF NOT rejected THEN RAISE EXCEPTION 'stale quantity bypass'; END IF;
 UPDATE public.organization_billing_sync SET synced_revision=revision WHERE organization_id=org;
 PERFORM public.publish_property(p2);
 IF public.get_public_guide('hb-paywall-'||p2) IS NULL THEN RAISE EXCEPTION 'paid guide denied'; END IF;
 rejected:=false;
 BEGIN INSERT INTO public.properties(id,organization_id,name,slug,status) VALUES(p3,org,'HB direct','hb-paywall-'||p3,'published');
 EXCEPTION WHEN SQLSTATE 'P0001' THEN rejected:=SQLERRM='hb_billing_sync_required'; END;
 IF NOT rejected THEN RAISE EXCEPTION 'direct published INSERT bypass'; END IF;
 UPDATE public.organization_payment_accounts SET subscription_status='past_due' WHERE organization_id=org;
 SELECT billing_grace_until INTO grace FROM public.organization_payment_accounts WHERE organization_id=org;
 IF NOT public.has_paid_publication_access(org) OR grace IS NULL THEN RAISE EXCEPTION 'grace missing'; END IF;
 UPDATE public.organization_payment_accounts SET subscription_status='past_due' WHERE organization_id=org;
 IF grace<>(SELECT billing_grace_until FROM public.organization_payment_accounts WHERE organization_id=org) THEN RAISE EXCEPTION 'retry extended grace'; END IF;
 UPDATE public.organization_payment_accounts SET billing_grace_until=now()-interval '1 second' WHERE organization_id=org;
 IF public.get_public_guide('hb-paywall-'||p2) IS NULL THEN RAISE EXCEPTION 'expired grace hid published snapshot'; END IF;
 IF public.get_public_guide('hb-paywall-'||p1) IS NULL THEN RAISE EXCEPTION 'free fallback lost'; END IF;
 UPDATE public.organization_payment_accounts SET subscription_status='canceled' WHERE organization_id=org;
 IF public.has_paid_publication_access(org) THEN RAISE EXCEPTION 'canceled access'; END IF;
 IF public.get_public_guide('hb-paywall-'||p2) IS NULL THEN RAISE EXCEPTION 'cancellation hid published snapshot'; END IF;
 IF (SELECT count(*) FROM public.properties WHERE organization_id=org)<>2 THEN RAISE EXCEPTION 'customer data removed'; END IF;
 UPDATE public.properties SET status='archived' WHERE id=p2;
 PERFORM public.publish_property(p1);
 rejected:=false;
 BEGIN UPDATE public.properties SET status='published' WHERE id=p2; EXCEPTION WHEN SQLSTATE 'P0001' THEN rejected:=SQLERRM='hb_subscription_required'; END;
 IF NOT rejected THEN RAISE EXCEPTION 'restore bypass'; END IF;
 UPDATE public.properties SET status='draft' WHERE id=p2;
 IF (SELECT count(*) FROM public.property_publications WHERE organization_id=org)<>2 THEN RAISE EXCEPTION 'snapshots deleted'; END IF;
 -- Save only this transaction's fixture identifiers for an actual anonymous role.
 PERFORM set_config('hb.p0.free_slug','hb-paywall-'||p1,true);
 PERFORM set_config('hb.p0.draft_slug','hb-paywall-'||p2,true);
 PERFORM set_config('hb.p0.snapshot',(SELECT guide::text FROM public.property_publications WHERE property_id=p1),true);
 -- Subsequent draft edits must not leak into the published snapshot.
 UPDATE public.guide_sections SET title='UNPUBLISHED EDIT' WHERE property_id=p1 AND section_key='arrival';
END $$;
SELECT set_config('request.jwt.claim.sub','',true);
SET LOCAL ROLE anon;
DO $$
DECLARE guide jsonb; refreshed jsonb;
BEGIN
 IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'test still has manager session'; END IF;
 guide:=public.get_public_guide(current_setting('hb.p0.free_slug'));
 refreshed:=public.get_public_guide(current_setting('hb.p0.free_slug'));
 IF guide IS NULL OR guide IS DISTINCT FROM refreshed THEN RAISE EXCEPTION 'anonymous read/refresh failed'; END IF;
 IF guide IS DISTINCT FROM current_setting('hb.p0.snapshot')::jsonb THEN RAISE EXCEPTION 'snapshot changed'; END IF;
 IF guide#>>'{sections,0,key}'<>'welcome' OR guide#>>'{sections,1,key}'<>'arrival' OR guide#>>'{sections,2,key}'<>'wifi'
 OR jsonb_array_length(guide->'sections')<>3 THEN RAISE EXCEPTION 'saved order/visibility lost'; END IF;
 IF guide#>>'{sections,0,content,items,0,text}'<>'P0 published content' THEN RAISE EXCEPTION 'content lost'; END IF;
 IF guide#>>'{sections,0,content,propertyMedia,coverId}' IS DISTINCT FROM guide#>>'{sections,0,media,0,id}' THEN RAISE EXCEPTION 'cover/media lost'; END IF;
 IF public.get_public_guide(current_setting('hb.p0.draft_slug')) IS NOT NULL OR public.get_public_guide('missing-p0-guide') IS NOT NULL THEN RAISE EXCEPTION 'draft/missing guide exposed'; END IF;
 IF has_table_privilege('anon','public.property_publications','SELECT') THEN RAISE EXCEPTION 'private snapshot table exposed'; END IF;
 IF EXISTS(SELECT 1 FROM public.properties) OR EXISTS(SELECT 1 FROM public.guide_sections) THEN RAISE EXCEPTION 'RLS exposed private rows'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
SELECT true AS paywall_assertions_passed, true AS fixtures_rolled_back;
