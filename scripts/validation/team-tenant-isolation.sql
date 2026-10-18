-- Run with a database owner on preview AFTER migration 0017.
-- Fictitious identities, rows and role changes exist only inside this transaction.
-- psql: use ON_ERROR_STOP=1. A failed assertion aborts; disconnect rolls everything back.
BEGIN;
CREATE TEMP TABLE hb_security_test AS SELECT gen_random_uuid() org_a,gen_random_uuid() org_b,
 gen_random_uuid() owner_a,gen_random_uuid() owner_b,gen_random_uuid() newcomer,
 gen_random_uuid() property_a,gen_random_uuid() property_b,gen_random_uuid() section_b,
 gen_random_uuid() conversation_a,gen_random_uuid() conversation_b,gen_random_uuid() service_b,gen_random_uuid() order_b;
GRANT SELECT ON hb_security_test TO authenticated,anon;
INSERT INTO auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
 SELECT owner_a,'hb-owner-a-'||owner_a||'@example.invalid',now(),'{}'::jsonb,'{}'::jsonb FROM hb_security_test
 UNION ALL SELECT owner_b,'hb-owner-b-'||owner_b||'@example.invalid',now(),'{}'::jsonb,'{}'::jsonb FROM hb_security_test
 UNION ALL SELECT newcomer,'hb-new-'||newcomer||'@example.invalid',now(),'{}'::jsonb,'{}'::jsonb FROM hb_security_test;
INSERT INTO public.organizations(id,name) SELECT org_a,'HB security A' FROM hb_security_test UNION ALL SELECT org_b,'HB security B' FROM hb_security_test;
INSERT INTO public.organization_members(organization_id,user_id,role) SELECT org_a,owner_a,'owner'::public.org_role FROM hb_security_test UNION ALL SELECT org_b,owner_b,'owner'::public.org_role FROM hb_security_test;
INSERT INTO public.properties(id,organization_id,name,slug) SELECT property_a,org_a,'HB A','hb-security-'||property_a FROM hb_security_test UNION ALL SELECT property_b,org_b,'HB B','hb-security-'||property_b FROM hb_security_test;
INSERT INTO public.guide_sections(id,property_id,section_key,title) SELECT section_b,property_b,'welcome','HB B' FROM hb_security_test;
INSERT INTO public.property_fields(property_id,key,category,label,value) SELECT property_b,'wifi','wifi','Wi-Fi','B secret' FROM hb_security_test;
INSERT INTO public.section_media(organization_id,property_id,section_id,media_type,storage_path,mime_type,file_size)
 SELECT org_b,property_b,section_b,'image',org_b||'/'||property_b||'/'||section_b||'/test.jpg','image/jpeg',100 FROM hb_security_test;
INSERT INTO storage.objects(bucket_id,name) SELECT 'guide-media',org_b||'/'||property_b||'/'||section_b||'/test.jpg' FROM hb_security_test;
INSERT INTO public.conversations(id,organization_id,property_id,guest_display_name) SELECT conversation_b,org_b,property_b,'Fictitious guest' FROM hb_security_test;
INSERT INTO public.conversations(id,organization_id,property_id,guest_display_name) SELECT conversation_a,org_a,property_a,'Fictitious guest A' FROM hb_security_test;
INSERT INTO public.messages(conversation_id,sender_type,body) SELECT conversation_a,'guest','A message' FROM hb_security_test;
INSERT INTO public.messages(conversation_id,sender_type,body) SELECT conversation_b,'guest','B confidential message' FROM hb_security_test;
INSERT INTO public.services(id,organization_id,property_id,name,price) SELECT service_b,org_b,property_b,'B service',15 FROM hb_security_test;
INSERT INTO public.orders(id,organization_id,property_id,service_id,total_amount) SELECT order_b,org_b,property_b,service_b,15 FROM hb_security_test;
INSERT INTO public.guest_feedback(organization_id,property_id,rating,comment) SELECT org_b,property_b,5,'B private feedback' FROM hb_security_test;
INSERT INTO public.organization_payment_accounts(organization_id,stripe_customer_id) SELECT org_b,'cus_hb_security_'||org_b FROM hb_security_test;
INSERT INTO public.order_payments(organization_id,order_id,stripe_account_id,amount_cents,token_hash) SELECT org_b,order_b,'acct_hb_security_'||org_b,1500,'hb_security_'||order_b FROM hb_security_test;
INSERT INTO public.pms_connections(organization_id,provider,encrypted_credentials) SELECT org_b,'guesty','fictitious-not-a-token' FROM hb_security_test;
INSERT INTO public.provider_import_links(organization_id,provider,external_id,property_id) SELECT org_b,'guesty','hb_security',property_b FROM hb_security_test;
INSERT INTO public.import_runs(organization_id,property_id,source_type) SELECT org_b,property_b,'text' FROM hb_security_test;
SELECT set_config('request.jwt.claims',json_build_object('sub',owner_a,'role','authenticated','email','hb-owner-a-'||owner_a||'@example.invalid')::text,true) FROM hb_security_test;
SET LOCAL ROLE authenticated;
DO $$ DECLARE c record; n integer; tbl text; result integer; BEGIN
 SELECT * INTO c FROM hb_security_test;
 -- Assert private tables actually exist and have RLS; never silently skip resources.
 FOREACH tbl IN ARRAY ARRAY['organizations','organization_members','properties','property_fields','guide_sections','section_media','conversations','messages','services','orders','guest_feedback','organization_payment_accounts','order_payments','pms_connections','provider_import_links','import_runs','organization_invitations'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class r JOIN pg_namespace s ON s.oid=r.relnamespace WHERE s.nspname='public' AND r.relname=tbl AND r.relrowsecurity) THEN RAISE EXCEPTION 'Missing RLS: %',tbl; END IF;
 END LOOP;
 FOREACH tbl IN ARRAY ARRAY['organization_members','properties','section_media','conversations','services','orders','guest_feedback','organization_payment_accounts','provider_import_links','import_runs','organization_invitations'] LOOP
  EXECUTE format('SELECT count(*) FROM public.%I WHERE organization_id=$1',tbl) INTO result USING c.org_b;
  IF result<>0 THEN RAISE EXCEPTION 'Cross-tenant read: %',tbl; END IF;
 END LOOP;
 FOREACH tbl IN ARRAY ARRAY['property_fields','guide_sections'] LOOP
  EXECUTE format('SELECT count(*) FROM public.%I WHERE property_id=$1',tbl) INTO result USING c.property_b;
  IF result<>0 THEN RAISE EXCEPTION 'Cross-tenant read: %',tbl; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.messages WHERE conversation_id=c.conversation_b) THEN RAISE EXCEPTION 'B message exposed'; END IF;
 IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='guide-media' AND name LIKE c.org_b||'/%') THEN RAISE EXCEPTION 'B storage exposed'; END IF;
 FOREACH tbl IN ARRAY ARRAY['order_payments','pms_connections','stripe_processed_events','guest_conversation_sessions'] LOOP
  IF has_table_privilege('authenticated','public.'||tbl,'SELECT') THEN RAISE EXCEPTION 'Private capability table readable: %',tbl; END IF;
 END LOOP;
 BEGIN
  PERFORM public.get_organization_team(c.org_b);
  RAISE EXCEPTION 'B team RPC exposed';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'forbidden' THEN RAISE; END IF; END;
 BEGIN
  PERFORM public.invite_organization_member(c.org_a,'hb-owner-a-'||c.owner_a||'@example.invalid','member');
  RAISE EXCEPTION 'Owner downgrade accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'owner protected' THEN RAISE; END IF; END;
 BEGIN
  INSERT INTO public.organization_invitations(organization_id,email,role,invited_by) VALUES(c.org_a,'hb-escalation@example.invalid','owner',c.owner_a);
  RAISE EXCEPTION 'Direct invitation privilege escalation accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.invite_organization_member(c.org_a,'hb-owner-b-'||c.owner_b||'@example.invalid','member');
  RAISE EXCEPTION 'Other tenant member hijacked';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'already member' THEN RAISE; END IF; END;
 UPDATE public.properties SET name='Intrusion' WHERE id=c.property_b; GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'B property mutation'; END IF;
 UPDATE public.conversations SET status='resolved' WHERE id=c.conversation_b; GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'B conversation mutation'; END IF;
 UPDATE public.orders SET status='confirmed' WHERE id=c.order_b; GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'B order mutation'; END IF;
 -- Owner can prepare a future signup, with no external email or account creation.
 PERFORM public.invite_organization_member(c.org_a,'hb-future-'||c.newcomer||'@example.invalid','admin');
END $$;
RESET ROLE;
-- Validate acceptance and idempotency using the fictitious newcomer JWT.
INSERT INTO public.organization_invitations(organization_id,email,role,invited_by)
 SELECT org_a,'hb-new-'||newcomer||'@example.invalid','member',owner_a FROM hb_security_test;
SELECT set_config('request.jwt.claims',json_build_object('sub',newcomer,'role','authenticated','email','hb-new-'||newcomer||'@example.invalid')::text,true) FROM hb_security_test;
SET LOCAL ROLE authenticated;
DO $$ DECLARE c record; result uuid; n integer; BEGIN
 SELECT * INTO c FROM hb_security_test;
 SELECT public.ensure_my_organization('Fictitious') INTO result;
 IF result<>c.org_a THEN RAISE EXCEPTION 'Invitation acceptance failed'; END IF;
 SELECT public.ensure_my_organization('Fictitious') INTO result;
 IF result<>c.org_a THEN RAISE EXCEPTION 'Repeat acceptance failed'; END IF;
 UPDATE public.messages SET read_at=now() WHERE conversation_id=c.conversation_a; GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'Member cannot mark message read'; END IF;
 BEGIN
  UPDATE public.messages SET body='Forged guest message' WHERE conversation_id=c.conversation_a;
  RAISE EXCEPTION 'Message history tampering accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 UPDATE public.properties SET name='Member edit' WHERE id=c.property_a; GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'Member edited property'; END IF;
 BEGIN
  INSERT INTO public.import_runs(organization_id,property_id,source_type) VALUES(c.org_a,c.property_a,'text');
  RAISE EXCEPTION 'Member started import';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.get_organization_team(c.org_a);
  RAISE EXCEPTION 'Member read team';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'forbidden' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims',json_build_object('sub',owner_a,'role','authenticated')::text,true) FROM hb_security_test;
SET LOCAL ROLE authenticated;
SELECT public.change_organization_member_role(org_a,newcomer,'admin') FROM hb_security_test;
RESET ROLE;
SELECT set_config('request.jwt.claims',json_build_object('sub',newcomer,'role','authenticated')::text,true) FROM hb_security_test;
SET LOCAL ROLE authenticated;
DO $$ DECLARE c record; n integer; BEGIN
 SELECT * INTO c FROM hb_security_test;
 UPDATE public.properties SET name='Admin edit' WHERE id=c.property_a; GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'Admin cannot edit own property'; END IF;
 BEGIN
  PERFORM public.change_organization_member_role(c.org_a,c.owner_a,'member');
  RAISE EXCEPTION 'Admin changed owner';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'forbidden' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims',json_build_object('sub',owner_a,'role','authenticated')::text,true) FROM hb_security_test;
SET LOCAL ROLE authenticated;
SELECT public.remove_organization_member(org_a,newcomer) FROM hb_security_test;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.organization_members WHERE user_id=(SELECT newcomer FROM hb_security_test) AND organization_id=(SELECT org_a FROM hb_security_test)) THEN RAISE EXCEPTION 'Member removal failed'; END IF; END $$;
RESET ROLE;
ROLLBACK;
SELECT true AS tenant_isolation_assertions_passed,true AS team_role_assertions_passed,true AS fixtures_rolled_back;
