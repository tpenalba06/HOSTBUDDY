-- New feature fixtures only, all inserted rows rolled back. No business rows
-- read or changed; no financial recipe or payment status fabricated.
BEGIN;
DO $$
DECLARE actor uuid:=gen_random_uuid(); org uuid:=gen_random_uuid(); other_org uuid:=gen_random_uuid(); p uuid:=gen_random_uuid(); p2 uuid:=gen_random_uuid(); foreign_p uuid:=gen_random_uuid(); sid uuid:=gen_random_uuid(); option uuid:=gen_random_uuid(); req uuid:=gen_random_uuid(); receipt text:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''); slot timestamptz:=now()+interval '1 day'; config jsonb; values jsonb; revision timestamptz; booked jsonb; repeated jsonb;
BEGIN
 INSERT INTO auth.users(id,email) VALUES(actor,'nona-service-fixture-'||actor::text||'@example.invalid');
 INSERT INTO public.organizations(id,name) VALUES(org,'NONA NEW SERVICES TEST'),(other_org,'NONA NEW SERVICES BOUNDARY');
 INSERT INTO public.organization_members(organization_id,user_id,role) VALUES(org,actor,'owner');
 PERFORM set_config('request.jwt.claim.sub',actor::text,true);
 INSERT INTO public.properties(id,organization_id,name,slug,status) VALUES(p,org,'NONA NEW SERVICES TEST','nona-service-fixture-'||p::text,'published'),(foreign_p,other_org,'NONA BOUNDARY TEST','nona-service-fixture-'||foreign_p::text,'published');
 INSERT INTO public.properties(id,organization_id,name,slug,status) VALUES(p2,org,'NONA SECOND DRAFT TEST','nona-service-fixture-'||p2::text,'draft');
 INSERT INTO public.property_publications(property_id,organization_id,guide) VALUES(p,org,jsonb_build_object('id',p,'name','TEST','sections','[]'::jsonb,'services','[]'::jsonb)),(foreign_p,other_org,jsonb_build_object('id',foreign_p,'name','TEST B','sections','[]'::jsonb,'services','[]'::jsonb));
 config:=jsonb_build_object('maxQuantity',3,'requestDate',true,'slots',jsonb_build_array(slot),'options',jsonb_build_array(jsonb_build_object('id',option,'label','Synthetic TEST option','priceCents',250)),'seller','Synthetic TEST seller','cancellation','Synthetic TEST terms');
 values:=jsonb_build_object('name','Synthetic TEST service','description','Synthetic fixture','price',10,'pricing_type','fixed','is_active',true,'property_ids',jsonb_build_array(p,p2),'booking_config',config,'image_paths','{}'::jsonb);
 PERFORM public.save_service_catalog(org,p,sid,values); PERFORM public.save_service_catalog(org,p,sid,values);
 IF (SELECT count(*) FROM public.services WHERE id=sid)<>1 THEN RAISE EXCEPTION 'service dedup failed'; END IF;
 SELECT updated_at INTO revision FROM public.services WHERE id=sid;
 IF jsonb_array_length(public.get_public_guide('nona-service-fixture-'||foreign_p::text)->'services')<>0 THEN RAISE EXCEPTION 'service boundary failed'; END IF;
 booked:=public.submit_service_booking('nona-service-fixture-'||p::text,sid,'Synthetic TEST guest','fixture@example.invalid',2,slot,'nona-new-service-fixture-'||req::text,req,receipt,option,'Synthetic TEST details',true,revision);
 repeated:=public.submit_service_booking('nona-service-fixture-'||p::text,sid,'Synthetic TEST guest','fixture@example.invalid',2,slot,'nona-new-service-fixture-'||req::text,req,receipt,option,'Synthetic TEST details',true,revision);
 IF booked IS DISTINCT FROM repeated OR (booked->>'amount')::numeric<>25 OR booked->>'status'<>'pending' THEN RAISE EXCEPTION 'service quote or dedup failed'; END IF;
 IF public.read_service_booking((booked->>'id')::uuid,repeat('b',64)) IS NOT NULL THEN RAISE EXCEPTION 'service receipt boundary failed'; END IF;
 UPDATE public.orders SET status='confirmed' WHERE id=(booked->>'id')::uuid;
 IF public.read_service_booking((booked->>'id')::uuid,receipt)->>'paymentStatus' IS NOT NULL THEN RAISE EXCEPTION 'false paid booking'; END IF;
 UPDATE public.services SET is_active=false,deleted_at=now() WHERE id=sid;
 IF jsonb_array_length(public.get_public_guide('nona-service-fixture-'||p::text)->'services')<>0 OR NOT EXISTS(SELECT 1 FROM public.orders WHERE id=(booked->>'id')::uuid) THEN RAISE EXCEPTION 'soft delete failed'; END IF;
 IF has_function_privilege('anon','public.submit_service_booking(text,uuid,text,text,integer,timestamptz,text,uuid,text,uuid,text,boolean,timestamptz)','EXECUTE') OR has_function_privilege('authenticated','public.read_service_booking(uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'service RPC grants failed'; END IF;
END $$;
ROLLBACK;
