import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("stay grants require a manager, are property-bound, and expire or revoke", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  const property = "10000000-0000-4000-8000-000000000001";
  const foreign = "10000000-0000-4000-8000-000000000002";
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE public.properties (id uuid PRIMARY KEY, organization_id uuid NOT NULL, slug text, status text);
    CREATE FUNCTION public.is_org_admin(uuid) RETURNS boolean LANGUAGE sql STABLE AS
      $$ SELECT $1::text = current_setting('test.org', true) $$;
    INSERT INTO public.properties VALUES
      ('${property}', '${property}', 'stay-a', 'published'),
      ('${foreign}', '${foreign}', 'stay-b', 'published');
    SELECT set_config('test.org', '${property}', false);
  `);
  await db.exec(
    readFileSync(
      new URL("../../drizzle/migrations/0027_guest_stay_access.sql", import.meta.url),
      "utf8",
    ),
  );
  const issue = (id, opens = "-1 hour", expires = "1 hour") =>
    db.query(
      "SELECT * FROM public.issue_guest_stay_access($1, now() + $2::interval, now() + $3::interval, 'TEST door', 'TEST-NET', 'TEST-only')",
      [id, opens, expires],
    );
  const read = async (slug, token) =>
    (await db.query("SELECT public.read_guest_stay_access($1,$2) AS stay", [slug, token])).rows[0]
      .stay;

  await db.exec("SET ROLE anon");
  await assert.rejects(() => issue(property), { code: "42501" });
  await assert.rejects(() => read("stay-a", "a".repeat(64)), { code: "42501" });
  await db.exec("SET ROLE authenticated");
  await assert.rejects(() => issue(foreign), { code: "42501" });
  await assert.rejects(() => db.query("SELECT * FROM public.guest_stay_access"), { code: "42501" });
  const { id, token } = (await issue(property)).rows[0];
  const future = (await issue(property, "1 hour", "2 hours")).rows[0];
  assert.match(token, /^[0-9a-f]{64}$/);
  await assert.rejects(() => read("stay-a", token), { code: "42501" });

  await db.exec("SET ROLE service_role");
  assert.equal((await read("stay-a", token)).wifiPassword, "TEST-only");
  assert.equal(await read("stay-b", token), null);
  assert.equal(await read("stay-a", future.token), null);
  assert.equal(await read("stay-a", token + "0"), null);
  await assert.rejects(() => db.query("SELECT * FROM public.guest_stay_access"), { code: "42501" });

  await db.exec("RESET ROLE");
  await db.query(
    "UPDATE public.guest_stay_access SET opens_at = now() - interval '2 hours', expires_at = now() - interval '1 hour' WHERE id = $1",
    [future.id],
  );
  await db.exec("SET ROLE service_role");
  assert.equal(await read("stay-a", future.token), null);

  await db.exec("SET ROLE authenticated");
  const revoke = async (target) =>
    (await db.query("SELECT public.revoke_guest_stay_access($1,$2) AS revoked", [target, id]))
      .rows[0].revoked;
  assert.equal(await revoke(foreign), false);
  assert.equal(await revoke(property), true);
  assert.equal(await revoke(property), false);
  await db.exec("SET ROLE service_role");
  assert.equal(await read("stay-a", token), null);
});
