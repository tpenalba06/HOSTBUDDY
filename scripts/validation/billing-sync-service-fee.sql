-- Run after 0016, inside a transaction which always rolls back all fixtures.
CREATE TEMP TABLE hb_billing_fixture AS SELECT gen_random_uuid() org,gen_random_uuid() p1,gen_random_uuid() p2,gen_random_uuid() svc,gen_random_uuid() ord,gen_random_uuid() lease;
INSERT INTO public.organizations(id,name) SELECT org,'HB billing isolated validation' FROM hb_billing_fixture;
INSERT INTO public.properties(id,organization_id,name,slug) SELECT p1,org,'HB draft','hb-billing-'||p1 FROM hb_billing_fixture UNION ALL SELECT p2,org,'HB published','hb-billing-'||p2 FROM hb_billing_fixture;
DO $$ DECLARE f record; job jsonb; job2 jsonb; r bigint; BEGIN
 SELECT * INTO f FROM hb_billing_fixture;
 IF has_function_privilege('authenticated','public.claim_billing_sync(uuid,uuid)','EXECUTE') OR has_function_privilege('authenticated','public.enqueue_billing_sync(uuid)','EXECUTE') OR has_table_privilege('authenticated','public.organization_billing_sync','SELECT') THEN RAISE EXCEPTION 'Billing outbox exposed'; END IF;
 job:=public.claim_billing_sync(f.org,f.lease);
 IF (job->>'propertyCount')::integer<>2 THEN RAISE EXCEPTION 'Draft counting failed'; END IF;
 job2:=public.claim_billing_sync(f.org,gen_random_uuid());
 IF job2 IS NOT NULL THEN RAISE EXCEPTION 'Double lease granted'; END IF;
 UPDATE public.properties SET status='archived' WHERE id=f.p2;
 PERFORM public.complete_billing_sync(f.org,f.lease,(job->>'revision')::bigint,NULL);
 IF NOT (SELECT pending FROM public.organization_billing_sync WHERE organization_id=f.org) THEN RAISE EXCEPTION 'Concurrent revision lost'; END IF;
 job:=public.claim_billing_sync(f.org,f.lease);
 IF (job->>'propertyCount')::integer<>1 THEN RAISE EXCEPTION 'Archive not excluded'; END IF;
 PERFORM public.complete_billing_sync(f.org,f.lease,(job->>'revision')::bigint,'stripe_sync_failed');
 IF NOT (SELECT pending FROM public.organization_billing_sync WHERE organization_id=f.org) THEN RAISE EXCEPTION 'Failed work lost'; END IF;
 UPDATE public.properties SET status='draft' WHERE id=f.p2;
 job:=public.claim_billing_sync(f.org,f.lease);
 IF (job->>'propertyCount')::integer<>2 THEN RAISE EXCEPTION 'Restore not counted'; END IF;
 PERFORM public.complete_billing_sync(f.org,f.lease,(job->>'revision')::bigint,NULL);
 SELECT revision INTO r FROM public.organization_billing_sync WHERE organization_id=f.org;
 UPDATE public.properties SET name='HB renamed' WHERE id=f.p1;
 IF r<>(SELECT revision FROM public.organization_billing_sync WHERE organization_id=f.org) THEN RAISE EXCEPTION 'Rename enqueued quantity'; END IF;
 DELETE FROM public.properties WHERE id=f.p2;
 job:=public.claim_billing_sync(f.org,f.lease);
 IF (job->>'propertyCount')::integer<>1 THEN RAISE EXCEPTION 'Deleted property counted'; END IF;
 PERFORM public.complete_billing_sync(f.org,f.lease,(job->>'revision')::bigint,NULL);
END $$;
INSERT INTO public.services(id,organization_id,property_id,name,price) SELECT svc,org,p1,'HB fee test',15 FROM hb_billing_fixture;
INSERT INTO public.orders(id,organization_id,property_id,service_id,total_amount) SELECT ord,org,p1,svc,15 FROM hb_billing_fixture;
INSERT INTO public.order_payments(organization_id,order_id,stripe_account_id,amount_cents,application_fee_cents,token_hash)
 SELECT org,ord,'acct_isolated',1500,30,'hb-fee-'||ord FROM hb_billing_fixture;
DO $$ BEGIN
 BEGIN UPDATE public.order_payments SET application_fee_cents=1500 WHERE order_id=(SELECT ord FROM hb_billing_fixture); RAISE EXCEPTION 'Invalid fee accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
