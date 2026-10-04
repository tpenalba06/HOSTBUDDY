-- Isolated fixtures and privilege changes are all rolled back.
BEGIN;
CREATE TEMP TABLE hb_payment_test AS SELECT gen_random_uuid() org_a,gen_random_uuid() org_b,
 gen_random_uuid() property_a,gen_random_uuid() property_b,gen_random_uuid() service_a,
 gen_random_uuid() service_b,gen_random_uuid() order_a,gen_random_uuid() order_b,
 user_id actor FROM public.organization_members LIMIT 1;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM hb_payment_test) THEN RAISE EXCEPTION 'Test actor missing'; END IF; END $$;
GRANT SELECT ON hb_payment_test TO authenticated;
INSERT INTO public.organizations(id,name) SELECT org_a,'HB payment test A' FROM hb_payment_test UNION ALL SELECT org_b,'HB payment test B' FROM hb_payment_test;
INSERT INTO public.organization_members(organization_id,user_id,role) SELECT org_a,actor,'member' FROM hb_payment_test;
INSERT INTO public.properties(id,organization_id,name,slug) SELECT property_a,org_a,'HB payment A','hb-pay-a-'||property_a FROM hb_payment_test UNION ALL SELECT property_b,org_b,'HB payment B','hb-pay-b-'||property_b FROM hb_payment_test;
INSERT INTO public.services(id,organization_id,property_id,name,price) SELECT service_a,org_a,property_a,'HB test breakfast',15 FROM hb_payment_test UNION ALL SELECT service_b,org_b,property_b,'HB test breakfast',15 FROM hb_payment_test;
INSERT INTO public.orders(id,organization_id,property_id,service_id,total_amount) SELECT order_a,org_a,property_a,service_a,15 FROM hb_payment_test UNION ALL SELECT order_b,org_b,property_b,service_b,15 FROM hb_payment_test;
INSERT INTO public.order_payments(organization_id,order_id,stripe_account_id,checkout_session_id,amount_cents,token_hash)
 SELECT org_a,order_a,'acct_hb_a_'||order_a,'cs_hb_'||order_a,1500,'hash_hb_'||order_a FROM hb_payment_test;
DO $$ DECLARE row_test record; ledger public.order_payments%ROWTYPE; result boolean; BEGIN
 SELECT * INTO row_test FROM hb_payment_test;
 PERFORM public.apply_stripe_event('evt_bad_'||row_test.order_a,'acct_hb_a_'||row_test.order_a,1,
  jsonb_build_object('kind','payment','session','cs_hb_'||row_test.order_a,'status','paid','amount',1,'currency','eur'));
 SELECT * INTO ledger FROM public.order_payments WHERE order_id=row_test.order_a;
 IF ledger.status<>'pending' THEN RAISE EXCEPTION 'Wrong amount accepted'; END IF;
 PERFORM public.apply_stripe_event('evt_other_'||row_test.order_a,'acct_hb_b_'||row_test.order_b,2,
  jsonb_build_object('kind','payment','session','cs_hb_'||row_test.order_a,'status','paid','amount',1500,'currency','eur'));
 SELECT * INTO ledger FROM public.order_payments WHERE order_id=row_test.order_a;
 IF ledger.status<>'pending' THEN RAISE EXCEPTION 'Wrong connected account accepted'; END IF;
 PERFORM public.apply_stripe_event('evt_paid_'||row_test.order_a,'acct_hb_a_'||row_test.order_a,3,
  jsonb_build_object('kind','payment','session','cs_hb_'||row_test.order_a,'intent','pi_hb_'||row_test.order_a,'status','paid','amount',1500,'currency','eur'));
 SELECT * INTO ledger FROM public.order_payments WHERE order_id=row_test.order_a;
 IF ledger.status<>'paid' THEN RAISE EXCEPTION 'Valid payment not recorded'; END IF;
 SELECT public.apply_stripe_event('evt_paid_'||row_test.order_a,'acct_hb_a_'||row_test.order_a,3,'{}') INTO result;
 IF result THEN RAISE EXCEPTION 'Duplicate webhook processed'; END IF;
 PERFORM public.apply_stripe_event('evt_expired_'||row_test.order_a,'acct_hb_a_'||row_test.order_a,4,
  jsonb_build_object('kind','payment','session','cs_hb_'||row_test.order_a,'status','expired'));
 SELECT * INTO ledger FROM public.order_payments WHERE order_id=row_test.order_a;
 IF ledger.status<>'paid' THEN RAISE EXCEPTION 'Delayed event regressed payment'; END IF;
END $$;
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM authenticated;
GRANT UPDATE(status) ON public.orders TO authenticated;
SELECT set_config('request.jwt.claims',json_build_object('sub',actor,'role','authenticated')::text,true) FROM hb_payment_test;
SET LOCAL ROLE authenticated;
DO $$ DECLARE own_order uuid; other_order uuid; affected integer; BEGIN
 SELECT order_a,order_b INTO own_order,other_order FROM hb_payment_test;
 UPDATE public.orders SET status='confirmed' WHERE id=own_order;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>1 THEN RAISE EXCEPTION 'Own status update failed'; END IF;
 BEGIN
  UPDATE public.orders SET total_amount=0.01 WHERE id=own_order;
  RAISE EXCEPTION 'Amount tampering was allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  DELETE FROM public.orders WHERE id=own_order;
  RAISE EXCEPTION 'Ledger deletion was allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF has_table_privilege('authenticated','public.orders','INSERT') THEN RAISE EXCEPTION 'Direct insertion allowed'; END IF;
 UPDATE public.orders SET status='confirmed' WHERE id=other_order;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>0 THEN RAISE EXCEPTION 'Cross-tenant mutation allowed'; END IF;
 IF EXISTS(SELECT 1 FROM public.orders WHERE id=other_order) THEN RAISE EXCEPTION 'Cross-tenant read allowed'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
SELECT true AS status_update_passed,true AS amount_protected,true AS delete_protected,
 true AS insert_protected,true AS tenant_isolation_passed,true AS webhook_ledger_passed,
 true AS fixtures_rolled_back;
