-- TEST ONLY: removes the added lock, preserving function bodies/ACLs/data.
-- This reopens the quota race; prefer a forward fix outside an isolated test.
BEGIN;
DO $$
DECLARE signature text; definition text;
 lock_statement text := 'PERFORM pg_advisory_xact_lock(hashtextextended(coalesce(_fingerprint, ''''), 0)); -- HB_ATOMIC_RATE_LIMIT';
BEGIN
 IF current_setting('hostbuddy.rollback_atomic_rate_limits',true) IS DISTINCT FROM 'test-only' THEN
  RAISE EXCEPTION 'TEST rollback opt-in required';
 END IF;
 FOREACH signature IN ARRAY ARRAY[
  'public.submit_guest_message(text,text,text,text,text,text)',
  'public.submit_guest_order(text,uuid,text,text,integer,timestamptz,text,text)',
  'public.submit_guest_feedback(text,text,integer,text,text,text)',
  'public.open_guest_thread(text,text,text,text,text,text)',
  'public.continue_guest_thread(text,uuid,text,text,text)'
 ] LOOP
  definition := pg_get_functiondef(signature::regprocedure);
  EXECUTE replace(definition,lock_statement,'');
 END LOOP;
END $$;
COMMIT;
