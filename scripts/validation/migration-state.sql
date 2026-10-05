-- READ ONLY: inventories actual hosted state. Does not apply or mark migrations.
BEGIN READ ONLY;
SELECT current_database() AS database_name, version() AS postgres_version;
SELECT table_schema,table_name FROM information_schema.tables
WHERE table_schema IN ('drizzle','supabase_migrations') ORDER BY 1,2;
SELECT n.nspname AS schema_name,c.relname AS table_name,c.relrowsecurity AS rls_enabled,c.relacl
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind='r' AND n.nspname IN ('public','storage') ORDER BY 1,2;
SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check
FROM pg_policies WHERE schemaname IN ('public','storage') ORDER BY 1,2,3;
SELECT p.oid::regprocedure AS signature,md5(pg_get_functiondef(p.oid)) AS definition_fingerprint,
       p.prosecdef AS security_definer,p.proconfig,p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prokind='f' ORDER BY 1;
SELECT
  position('property_publications' in pg_get_functiondef('public.get_public_guide(text)'::regprocedure))>0 AS snapshot_rpc,
  position('has_publication_access' in pg_get_functiondef('public.get_public_guide(text)'::regprocedure))=0 AS guide_availability_fix,
  has_function_privilege('anon','public.get_public_guide(text)','EXECUTE') AS anon_guide_rpc,
  has_table_privilege('anon','public.property_publications','SELECT') AS anon_snapshot_table;
SELECT tgname,pg_get_triggerdef(oid) FROM pg_trigger WHERE NOT tgisinternal ORDER BY tgname;
ROLLBACK;
