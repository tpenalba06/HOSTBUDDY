BEGIN;
CREATE TABLE IF NOT EXISTS public.guest_conversation_sessions (
 conversation_id uuid PRIMARY KEY REFERENCES public.conversations(id) ON DELETE CASCADE,
 token_hash text NOT NULL CHECK (token_hash ~ '^[0-9a-f]{64}$'),
 expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days'
);
ALTER TABLE public.guest_conversation_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.guest_conversation_sessions FROM anon,authenticated;
GRANT ALL ON public.guest_conversation_sessions TO service_role;
CREATE OR REPLACE FUNCTION public.open_guest_thread(_slug text,_name text,_contact text,_body text,_fingerprint text,_token_hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.properties%ROWTYPE; c uuid;
BEGIN
 IF char_length(trim(_name)) NOT BETWEEN 1 AND 80 OR char_length(trim(_body)) NOT BETWEEN 1 AND 2000 OR char_length(_contact)>255 OR _token_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'invalid input'; END IF;
 SELECT * INTO p FROM public.properties WHERE slug=_slug AND status='published';
 IF p.id IS NULL OR NOT EXISTS(SELECT 1 FROM public.property_messaging_settings WHERE property_id=p.id AND is_enabled) THEN RAISE EXCEPTION 'unavailable'; END IF;
 IF (SELECT count(*) FROM public.guest_message_rate_limits WHERE fingerprint=_fingerprint AND created_at>now()-interval '1 hour')>=10 THEN RAISE EXCEPTION 'rate limited'; END IF;
 INSERT INTO public.guest_message_rate_limits(fingerprint) VALUES(_fingerprint);
 -- Always new: a matching guest name/contact must never disclose someone else's thread.
 INSERT INTO public.conversations(organization_id,property_id,guest_display_name,guest_contact) VALUES(p.organization_id,p.id,trim(_name),nullif(trim(_contact),'')) RETURNING id INTO c;
 INSERT INTO public.messages(conversation_id,sender_type,body) VALUES(c,'guest',trim(_body));
 INSERT INTO public.guest_conversation_sessions(conversation_id,token_hash) VALUES(c,_token_hash);
 RETURN c;
END $$;
CREATE OR REPLACE FUNCTION public.read_guest_thread(_slug text,_conversation uuid,_token_hash text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('id',c.id,'status',c.status,'messages',coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.id,'sender_type',m.sender_type,'body',m.body,'created_at',m.created_at) ORDER BY m.created_at,m.id) FROM (SELECT * FROM public.messages WHERE conversation_id=c.id ORDER BY created_at DESC,id DESC LIMIT 100) m),'[]'::jsonb))
 FROM public.conversations c JOIN public.properties p ON p.id=c.property_id JOIN public.guest_conversation_sessions s ON s.conversation_id=c.id
 WHERE c.id=_conversation AND p.slug=_slug AND p.status='published' AND s.expires_at>now() AND s.token_hash=_token_hash AND EXISTS(SELECT 1 FROM public.property_messaging_settings WHERE property_id=p.id AND is_enabled)
$$;
CREATE OR REPLACE FUNCTION public.continue_guest_thread(_slug text,_conversation uuid,_token_hash text,_body text,_fingerprint text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF char_length(trim(_body)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'invalid input'; END IF;
 IF public.read_guest_thread(_slug,_conversation,_token_hash) IS NULL THEN RAISE EXCEPTION 'unavailable'; END IF;
 IF (SELECT count(*) FROM public.guest_message_rate_limits WHERE fingerprint=_fingerprint AND created_at>now()-interval '1 hour')>=10 THEN RAISE EXCEPTION 'rate limited'; END IF;
 INSERT INTO public.guest_message_rate_limits(fingerprint) VALUES(_fingerprint);
 INSERT INTO public.messages(conversation_id,sender_type,body) VALUES(_conversation,'guest',trim(_body));
 UPDATE public.conversations SET last_message_at=now(),status='open' WHERE id=_conversation;
END $$;
-- Only trusted server handlers can invoke these; the guest token never enters URLs.
REVOKE ALL ON FUNCTION public.open_guest_thread(text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.read_guest_thread(text,uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.continue_guest_thread(text,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.open_guest_thread(text,text,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_guest_thread(text,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.continue_guest_thread(text,uuid,text,text,text) TO service_role;

CREATE TEMP TABLE hb_thread_context AS SELECT gen_random_uuid() org_id,gen_random_uuid() prop_id,gen_random_uuid()::text slug,null::uuid c1,null::uuid c2,m.user_id actor FROM public.organization_members m JOIN public.properties p ON p.organization_id=m.organization_id WHERE p.id='977b8f7f-2505-4c8f-8076-09b1ba8847ff' AND m.role='owner' LIMIT 1;
CREATE TEMP TABLE hb_thread_results(test text,passed boolean);
GRANT ALL ON hb_thread_context,hb_thread_results TO authenticated,service_role;
INSERT INTO public.organizations(id,name) SELECT org_id,'HB thread validation' FROM hb_thread_context;
INSERT INTO public.organization_members(organization_id,user_id,role) SELECT org_id,actor,'owner' FROM hb_thread_context;
INSERT INTO public.properties(id,organization_id,slug,status) SELECT prop_id,org_id,slug,'published' FROM hb_thread_context;
INSERT INTO public.property_messaging_settings(property_id,is_enabled) SELECT prop_id,true FROM hb_thread_context;
SET LOCAL ROLE service_role;
UPDATE hb_thread_context SET c1=public.open_guest_thread(slug,'Synthetic guest','','First test','hb-thread-'||slug,repeat('a',64));
UPDATE hb_thread_context SET c2=public.open_guest_thread(slug,'Synthetic guest','','Second test','hb-thread-'||slug,repeat('b',64));
INSERT INTO hb_thread_results SELECT 'same name does not merge threads',c1<>c2 FROM hb_thread_context;
INSERT INTO hb_thread_results SELECT 'valid capability reads own thread',public.read_guest_thread(slug,c1,repeat('a',64)) IS NOT NULL FROM hb_thread_context;
INSERT INTO hb_thread_results SELECT 'wrong capability cannot read thread',public.read_guest_thread(slug,c1,repeat('b',64)) IS NULL FROM hb_thread_context;
SELECT set_config('request.jwt.claim.sub',(SELECT actor::text FROM hb_thread_context),true);
SET LOCAL ROLE authenticated;
INSERT INTO public.messages(conversation_id,sender_type,sender_user_id,body) SELECT c1,'manager',actor,'Manager test reply' FROM hb_thread_context;
SET LOCAL ROLE service_role;
INSERT INTO hb_thread_results SELECT 'manager reply returned to guest',public.read_guest_thread(slug,c1,repeat('a',64))::text LIKE '%Manager test reply%' FROM hb_thread_context;
DO $$ DECLARE ctx record; BEGIN SELECT * INTO ctx FROM hb_thread_context; PERFORM public.continue_guest_thread(ctx.slug,ctx.c1,repeat('a',64),'Follow-up test','hb-thread-'||ctx.slug); END $$;
INSERT INTO hb_thread_results SELECT 'guest can continue own thread',public.read_guest_thread(slug,c1,repeat('a',64))::text LIKE '%Follow-up test%' FROM hb_thread_context;
UPDATE public.properties SET status='draft' WHERE id=(SELECT prop_id FROM hb_thread_context);
INSERT INTO hb_thread_results SELECT 'unpublished guide blocks thread',public.read_guest_thread(slug,c1,repeat('a',64)) IS NULL FROM hb_thread_context;
UPDATE public.properties SET status='published' WHERE id=(SELECT prop_id FROM hb_thread_context);
UPDATE public.guest_conversation_sessions SET expires_at=now()-interval '1 second' WHERE conversation_id=(SELECT c1 FROM hb_thread_context);
INSERT INTO hb_thread_results SELECT 'expired capability rejected',public.read_guest_thread(slug,c1,repeat('a',64)) IS NULL FROM hb_thread_context;
RESET ROLE;
INSERT INTO hb_thread_results VALUES ('anon cannot read capabilities',NOT has_table_privilege('anon','public.guest_conversation_sessions','SELECT'));
INSERT INTO hb_thread_results VALUES ('anon cannot bypass server',NOT has_function_privilege('anon','public.open_guest_thread(text,text,text,text,text,text)','EXECUTE'));
SELECT test,passed FROM hb_thread_results ORDER BY test;
ROLLBACK;
