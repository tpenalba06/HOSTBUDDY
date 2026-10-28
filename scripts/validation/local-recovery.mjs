// This script only creates in-memory PostgreSQL fixtures. It cannot open a remote DB.
import { fileURLToPath, pathToFileURL } from "node:url";
const modulePath = process.env.HOSTBUDDY_PGLITE_MODULE;
if (!modulePath) throw new Error("HOSTBUDDY_PGLITE_MODULE is required");
const { PGlite } = await import(pathToFileURL(modulePath).href);
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
const root = fileURLToPath(new URL("../../", import.meta.url));
const backupDir = mkdtempSync(tmpdir() + "/hb-local-recovery-");
const media = Buffer.from("LOCAL SYNTHETIC STORAGE BYTES");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
mkdirSync(backupDir + "/storage");
writeFileSync(backupDir + "/storage/fixture.jpg", media);
const db = new PGlite();
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role; CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email varchar,email_confirmed_at timestamptz,raw_app_meta_data jsonb,raw_user_meta_data jsonb);
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),auth.jwt()->>'sub')::uuid $$;
CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated,service_role;
GRANT ALL ON storage.objects TO authenticated,service_role;`);
const migrations = readdirSync(root + "/drizzle/migrations")
  .filter((x) => /^\d{4}_.+\.sql$/.test(x))
  .sort();
for (const file of migrations) {
  await db.exec(readFileSync(root + "/drizzle/migrations/" + file, "utf8"));
  console.log("applied_local", file);
}
await db.exec(`INSERT INTO auth.users(id,email) VALUES('11111111-1111-4111-8111-111111111111','local@example.invalid');
INSERT INTO public.organizations(id,name) VALUES('22222222-2222-4222-8222-222222222222','LOCAL recovery fixture');
INSERT INTO public.organization_members(organization_id,user_id,role) VALUES('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','owner');
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
INSERT INTO public.properties(id,organization_id,name,slug) VALUES('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222','LOCAL recovery property','local-recovery');
INSERT INTO public.guide_sections(id,property_id,section_key,title,content) VALUES('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333','wifi','Wi-Fi','{"items":[{"text":"LOCAL fixture"}]}');
INSERT INTO storage.objects(bucket_id,name) VALUES('guide-media','22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333/44444444-4444-4444-8444-444444444444/fixture.jpg');
SELECT public.publish_property('33333333-3333-4333-8333-333333333333');`);
for (const file of [
  "publication-billing-gate.sql",
  "billing-sync-queue.sql",
  "order-payment-integrity.sql",
  "team-tenant-isolation.sql",
  "atomic-public-rate-limits.sql",
]) {
  await db.exec(
    "SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','{}',false)",
  );
  await db.exec(readFileSync(root + "/scripts/validation/" + file, "utf8"));
  console.log("validated_local", file);
}
const snapshot = async (d) => {
  await d.exec('SET search_path TO "$user",public');
  const tables = (
    await d.query(
      `SELECT schemaname,tablename FROM pg_tables WHERE schemaname IN ('public','auth','storage') ORDER BY schemaname,tablename`,
    )
  ).rows;
  const data = [];
  for (const t of tables) {
    data.push({
      table: t.schemaname + "." + t.tablename,
      rows: (
        await d.query(
          `SELECT to_jsonb(t) AS row FROM "${t.schemaname}"."${t.tablename}" t ORDER BY to_jsonb(t)::text`,
        )
      ).rows,
    });
  }
  const policies = (
    await d.query(
      `SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname IN ('public','storage') ORDER BY schemaname,tablename,policyname`,
    )
  ).rows;
  const rls = (
    await d.query(
      `SELECT n.nspname,c.relname,c.relrowsecurity,c.relacl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname IN ('public','auth','storage') ORDER BY 1,2`,
    )
  ).rows;
  const functions = (
    await d.query(
      `SELECT p.oid::regprocedure::text AS signature,pg_get_functiondef(p.oid) AS definition,p.proacl FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','auth','storage') AND p.prokind='f' ORDER BY 1`,
    )
  ).rows;
  return createHash("sha256")
    .update(JSON.stringify({ data, policies, rls, functions }))
    .digest("hex");
};
const before = await snapshot(db);
const dumpModulePath = process.env.HOSTBUDDY_PGDUMP_MODULE;
if (!dumpModulePath) throw new Error("HOSTBUDDY_PGDUMP_MODULE is required");
const { pgDump } = await import(pathToFileURL(dumpModulePath).href);
const sqlDump = await pgDump({
  pg: db,
  args: ["--schema=public", "--schema=auth", "--schema=storage", "--no-owner"],
});
const sqlBytes = Buffer.from(await sqlDump.arrayBuffer());
writeFileSync(backupDir + "/database.sql", sqlBytes);
const archive = await db.dumpDataDir("gzip");
const archiveBytes = Buffer.from(await archive.arrayBuffer());
writeFileSync(backupDir + "/database.tar.gz", archiveBytes);
const backupManifest = {
  databaseSha256: hash(archiveBytes),
  sqlSha256: hash(sqlBytes),
  mediaSha256: hash(media),
};
writeFileSync(backupDir + "/manifest.json", JSON.stringify(backupManifest));
await db.close();
const saved = JSON.parse(readFileSync(backupDir + "/manifest.json", "utf8"));
const savedArchive = readFileSync(backupDir + "/database.tar.gz");
const restoredMedia = readFileSync(backupDir + "/storage/fixture.jpg");
if (hash(savedArchive) !== saved.databaseSha256 || hash(restoredMedia) !== saved.mediaSha256)
  throw new Error("backup_checksum_mismatch");
const restored = new PGlite({ loadDataDir: new Blob([savedArchive]) });
const after = await snapshot(restored);
if (before !== after) throw new Error("restore_integrity_mismatch");
await restored.exec(
  "SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','{}',false); SET ROLE anon",
);
const guide = (await restored.query("SELECT public.get_public_guide('local-recovery') AS guide"))
  .rows[0].guide;
if (!guide || guide.name !== "LOCAL recovery property")
  throw new Error("public_guide_restore_failed");
await restored.exec("RESET ROLE");
for (const file of [
  "publication-billing-gate.sql",
  "billing-sync-queue.sql",
  "order-payment-integrity.sql",
  "team-tenant-isolation.sql",
  "atomic-public-rate-limits.sql",
]) {
  await restored.exec(
    "SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','{}',false)",
  );
  await restored.exec(readFileSync(root + "/scripts/validation/" + file, "utf8"));
}
console.log(
  JSON.stringify({
    migrations: migrations.length,
    restored: true,
    dataAndRlsChecksum: after,
    anonymousPublishedGuide: true,
    sqlAssertionsAfterRestore: true,
    storageBytesVerified: true,
    databaseArchiveSha256: saved.databaseSha256,
  }),
);
await restored.close();
// Logical dump restored into a NEW empty database, never a remote target.
const savedSql = readFileSync(backupDir + "/database.sql");
if (hash(savedSql) !== saved.sqlSha256) throw new Error("sql_backup_checksum_mismatch");
const sql = savedSql.toString().replace(/^\\(?:un)?restrict .*$/gm, "");
const logical = new PGlite();
await logical.exec(
  "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;",
);
if (sql.includes("CREATE SCHEMA public;")) await logical.exec("DROP SCHEMA public;");
await logical.exec(sql);
// pg_dump's SET row_security=off is session-local; restore normal enforcement.
await logical.exec("SET row_security=on");
if (before !== (await snapshot(logical))) throw new Error("logical_restore_integrity_mismatch");
await logical.exec(
  "SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','{}',false); SET ROLE anon",
);
if (
  !(await logical.query("SELECT public.get_public_guide('local-recovery') AS guide")).rows[0].guide
)
  throw new Error("logical_anonymous_guide_missing");
await logical.exec("RESET ROLE");
for (const file of [
  "publication-billing-gate.sql",
  "billing-sync-queue.sql",
  "order-payment-integrity.sql",
  "team-tenant-isolation.sql",
  "atomic-public-rate-limits.sql",
]) {
  await logical.exec(
    "SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','{}',false)",
  );
  await logical.exec(readFileSync(root + "/scripts/validation/" + file, "utf8"));
}
await logical.close();
console.log(
  JSON.stringify({
    logicalPgDumpRestore: true,
    anonymousGuide: true,
    sqlAssertions: true,
    sqlSha256: saved.sqlSha256,
  }),
);
