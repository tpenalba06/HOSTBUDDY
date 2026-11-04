-- Deploy the server handlers using supabaseAdmin BEFORE applying this change.
-- No data changes. Prevent bypassing server-generated anti-spam fingerprints.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.submit_guest_message(text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_guest_order(text,uuid,text,text,integer,timestamptz,text,text) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_guest_feedback(text,text,integer,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_guest_message(text,text,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_guest_order(text,uuid,text,text,integer,timestamptz,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_guest_feedback(text,text,integer,text,text,text) TO service_role;
COMMIT;
