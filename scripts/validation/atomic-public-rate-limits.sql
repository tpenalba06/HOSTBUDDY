BEGIN READ ONLY;
DO $$
DECLARE signature text; definition text;
BEGIN
 FOREACH signature IN ARRAY ARRAY[
  'public.submit_guest_message(text,text,text,text,text,text)',
  'public.submit_guest_order(text,uuid,text,text,integer,timestamptz,text,text)',
  'public.submit_guest_feedback(text,text,integer,text,text,text)',
  'public.open_guest_thread(text,text,text,text,text,text)',
  'public.continue_guest_thread(text,uuid,text,text,text)'
 ] LOOP
  definition := pg_get_functiondef(signature::regprocedure);
  IF position('HB_ATOMIC_RATE_LIMIT' IN definition)=0
   OR position('pg_advisory_xact_lock' IN definition)>position('IF (SELECT count(*)' IN definition)
   THEN RAISE EXCEPTION 'Quota lock missing or too late: %',signature; END IF;
  IF has_function_privilege('anon',signature,'EXECUTE')
   OR has_function_privilege('authenticated',signature,'EXECUTE')
   OR NOT has_function_privilege('service_role',signature,'EXECUTE')
   THEN RAISE EXCEPTION 'Submission grants changed: %',signature; END IF;
 END LOOP;
END $$;
ROLLBACK;
SELECT true AS atomic_quota_structure_and_grants_passed;
