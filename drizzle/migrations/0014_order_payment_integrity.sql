-- Operations can change a request's status, never its authoritative quote.
-- No rows are modified. Guest creation continues through the service-only RPC.
-- Rollback: GRANT INSERT, UPDATE, DELETE ON public.orders TO authenticated;
BEGIN;
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM authenticated;
GRANT UPDATE(status) ON public.orders TO authenticated;
COMMIT;
