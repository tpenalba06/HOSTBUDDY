import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
const [inputSql, privateResult] = process.argv.slice(2);
if (!inputSql || !privateResult)
  throw new Error("Usage: real-export-recovery.mjs PRIVATE_SELECTED_SQL PRIVATE_RESULT_JSON");
// A fresh embedded database only. No remote connection, Auth server, mail, or HTTP.
const sql = readFileSync(inputSql, "utf8").replace(/^\\(?:un)?restrict .*$/gm, "");
const roles = new Set([
  "anon",
  "authenticated",
  "service_role",
  "supabase_admin",
  "supabase_auth_admin",
  "supabase_storage_admin",
  "supabase_realtime_admin",
  "supabase_replication_admin",
  "supabase_read_only_user",
  "authenticator",
  "dashboard_user",
  "pgbouncer",
  "sandbox_exec",
]);
for (const match of sql.matchAll(/(?:GRANT|REVOKE) [^;]+? (?:TO|FROM) ([^;]+);/g)) {
  const tail = match[1].replace(/ WITH GRANT OPTION$/, "");
  for (const role of tail.split(/,\s*/))
    if (/^\w+$/.test(role) && !["PUBLIC", "postgres", "pg_database_owner"].includes(role))
      roles.add(role);
}
for (const match of sql.matchAll(/ALTER DEFAULT PRIVILEGES FOR ROLE (\w+)/g))
  if (match[1] !== "postgres") roles.add(match[1]);
const db = new PGlite({ extensions: { pgcrypto, "uuid-ossp": uuid_ossp } });
let stage = "roles";
try {
  await db.exec(
    [...roles]
      .map((r) => `CREATE ROLE "${r}" ${r === "service_role" ? "BYPASSRLS" : ""};`)
      .join("\n"),
  );
  let offset = 0,
    copies = 0;
  for (const match of sql.matchAll(/^(COPY [^\n]+ FROM stdin;)[\r]?\n([\s\S]*?)^\\\.[\r]?$/gm)) {
    stage = `schema_before_copy_${copies}`;
    await db.exec(sql.slice(offset, match.index));
    stage = `copy_${copies}_${match[1].split(" ")[1]}`;
    await db.query(match[1].replace("FROM stdin", "FROM '/dev/blob'"), [], {
      blob: new Blob([match[2]]),
    });
    copies++;
    offset = match.index + match[0].length;
  }
  stage = "post_data";
  await db.exec(sql.slice(offset));
  await db.exec("SET row_security=on; RESET search_path");
  const tables = (
    await db.query(
      `SELECT schemaname,tablename FROM pg_tables WHERE schemaname IN ('public','auth','storage','drizzle') ORDER BY 1,2`,
    )
  ).rows;
  const inventory = [];
  for (const t of tables) {
    const q = `SELECT count(*)::int AS count, md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY md5(to_jsonb(t)::text)),'')) AS fingerprint FROM "${t.schemaname}"."${t.tablename}" t`;
    inventory.push({ table: `${t.schemaname}.${t.tablename}`, ...(await db.query(q)).rows[0] });
  }
  const copyIntegrity = [];
  const digest = (text) =>
    createHash("sha256").update(text.split("\n").filter(Boolean).sort().join("\n")).digest("hex");
  for (const match of sql.matchAll(/^(COPY [^\n]+ FROM stdin;)[\r]?\n([\s\S]*?)^\\\.[\r]?$/gm)) {
    const exported = await db.query(match[1].replace("FROM stdin", "TO '/dev/blob'"));
    const equal = digest(match[2]) === digest(exported.blob ? await exported.blob.text() : "");
    copyIntegrity.push({ table: match[1].split(" ")[1], equal });
    if (!equal)
      throw Object.assign(new Error("copy_integrity_mismatch"), { code: "COPY_MISMATCH" });
  }
  const policies = (
    await db.query(
      `SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname IN ('public','storage') ORDER BY 1,2,3`,
    )
  ).rows;
  const rls = (
    await db.query(
      `SELECT n.nspname AS schema,c.relname AS table,c.relrowsecurity AS enabled FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname IN ('public','auth','storage') ORDER BY 1,2`,
    )
  ).rows;
  writeFileSync(
    privateResult,
    JSON.stringify({ copies, inventory, policies, rls, copyIntegrity }, null, 2),
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      restored: true,
      copies,
      tables: tables.length,
      policies: policies.length,
      copyIntegrity: copyIntegrity.every((x) => x.equal),
      schemas: ["public", "auth", "storage", "drizzle"],
      managedInfrastructureRestored: false,
    }),
  );
} catch (e) {
  writeFileSync(
    privateResult + ".error.json",
    JSON.stringify({ stage, code: e.code, message: e.message, query: e.query }, null, 2),
    { mode: 0o600 },
  );
  console.log(JSON.stringify({ restored: false, stage, code: e.code }));
  process.exitCode = 1;
} finally {
  await db.close();
}
