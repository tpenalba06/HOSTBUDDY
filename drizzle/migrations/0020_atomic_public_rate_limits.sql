-- Security-only: serialize each fingerprint's quota check + insertion.
-- No data changes, policies or grants. CREATE OR REPLACE preserves function ACLs.
-- This migration must be applied only after checking the target catalog.
BEGIN;
DO $$
DECLARE signature text; definition text;
 lock_statement text := 'PERFORM pg_advisory_xact_lock(hashtextextended(coalesce(_fingerprint, ''''), 0)); -- HB_ATOMIC_RATE_LIMIT';
BEGIN
 FOREACH signature IN ARRAY ARRAY[
  'public.submit_guest_message(text,text,text,text,text,text)',
  'public.submit_guest_order(text,uuid,text,text,integer,timestamptz,text,text)',
  'public.submit_guest_feedback(text,text,integer,text,text,text)',
  'public.open_guest_thread(text,text,text,text,text,text)',
  'public.continue_guest_thread(text,uuid,text,text,text)'
 ] LOOP
  definition := pg_get_functiondef(signature::regprocedure);
  IF position('HB_ATOMIC_RATE_LIMIT' IN definition)>0 THEN CONTINUE; END IF;
  IF position('IF (SELECT count(*)' IN definition)=0 THEN
   RAISE EXCEPTION 'Unexpected rate limit definition: %',signature;
  END IF;
  EXECUTE replace(definition,'IF (SELECT count(*)',lock_statement||E'\n IF (SELECT count(*)');
 END LOOP;
END $$;
COMMIT;
