-- Preview only. Fictitious fixtures are rolled back, no Stripe/network call.
BEGIN;
DO $$
DECLARE
  org uuid := gen_random_uuid();
  p1 uuid := gen_random_uuid();
  p2 uuid := gen_random_uuid();
  lease uuid := gen_random_uuid();
  other_lease uuid := gen_random_uuid();
  job jsonb;
  revision bigint;
BEGIN
  INSERT INTO public.organizations(id,name) VALUES(org,'HB scheduler rollback fixture');
  INSERT INTO public.properties(id,organization_id,name,slug)
    VALUES(p1,org,'HB scheduler A','hb-scheduler-'||p1),
          (p2,org,'HB scheduler B','hb-scheduler-'||p2);
  job := public.claim_billing_sync(org,lease);
  IF job IS NULL OR (job->>'propertyCount')::int <> 2 THEN
    RAISE EXCEPTION 'Two properties not counted';
  END IF;
  revision := (job->>'revision')::bigint;
  IF public.claim_billing_sync(org,other_lease) IS NOT NULL THEN
    RAISE EXCEPTION 'Concurrent lease allowed';
  END IF;
  UPDATE public.properties SET status='archived' WHERE id=p2;
  PERFORM public.complete_billing_sync(org,lease,revision,NULL);
  IF NOT (SELECT pending FROM public.organization_billing_sync WHERE organization_id=org) THEN
    RAISE EXCEPTION 'Property change during lease lost';
  END IF;
  job := public.claim_billing_sync(org,lease);
  IF (job->>'propertyCount')::int <> 1 THEN RAISE EXCEPTION 'Archive not counted'; END IF;
  revision := (job->>'revision')::bigint;
  PERFORM public.complete_billing_sync(org,other_lease,revision,NULL);
  IF (SELECT lease_token FROM public.organization_billing_sync WHERE organization_id=org) <> lease THEN
    RAISE EXCEPTION 'Wrong lease could complete job';
  END IF;
  PERFORM public.complete_billing_sync(org,lease,revision,'synthetic_failure');
  IF NOT (SELECT pending AND last_error='synthetic_failure' FROM public.organization_billing_sync WHERE organization_id=org) THEN
    RAISE EXCEPTION 'Failure acknowledged as success';
  END IF;
  job := public.claim_billing_sync(org,lease);
  IF job IS NULL THEN RAISE EXCEPTION 'Failed job cannot retry'; END IF;
  PERFORM public.complete_billing_sync(org,lease,(job->>'revision')::bigint,NULL);
  IF public.claim_billing_sync(org,lease) IS NOT NULL THEN RAISE EXCEPTION 'Completed job reclaimed'; END IF;
  UPDATE public.properties SET status='draft' WHERE id=p2;
  job := public.claim_billing_sync(org,lease);
  IF (job->>'propertyCount')::int <> 2 THEN RAISE EXCEPTION 'Restore not counted'; END IF;
  UPDATE public.organization_billing_sync SET lease_until=now()-interval '1 second' WHERE organization_id=org;
  job := public.claim_billing_sync(org,other_lease);
  IF job IS NULL THEN RAISE EXCEPTION 'Expired lease cannot recover'; END IF;
  PERFORM public.complete_billing_sync(org,other_lease,(job->>'revision')::bigint,NULL);
  IF has_function_privilege('authenticated','public.claim_billing_sync(uuid,uuid)','EXECUTE')
    OR has_function_privilege('anon','public.claim_billing_sync(uuid,uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Private scheduler RPC publicly executable';
  END IF;
END $$;
ROLLBACK;
SELECT true AS queue_revision_tests_passed, true AS retry_and_lease_tests_passed,
  true AS fixtures_rolled_back;
