import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, expect, it } from "vitest";
let db: PGlite;
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const hash = (n: number) => n.toString(16).padStart(64, "a");
beforeEach(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls; create table public.properties(id uuid primary key,organization_id uuid,status text);",
  );
  for (let i = 1; i <= 12; i++)
    await db.query("insert into public.properties values($1,$2,'published')", [id(i), id(100 + i)]);
  for (const name of [
    "0024_concierge_budget.sql",
    "0025_concierge_budget_read.sql",
    "0026_concierge_metered_cloud.sql",
  ])
    await db.exec(
      await readFile(new URL("../../drizzle/migrations/" + name, import.meta.url), "utf8"),
    );
});
afterEach(async () => db.close());
async function enable(cap = 20000000) {
  await db.query(
    "update public.nona_cloud_policy set enabled=true,approved_until=now()+interval '1 hour',monthly_cap_micros=$1",
    [cap],
  );
}
async function reserve(n: number, property = 1, conversation = n, visitor = n, network = n) {
  const r = await db.query<{ ok: boolean }>(
    "select public.nona_reserve_cloud_attempt($1,$2,$3,$4,$5) ok",
    [id(property), id(1000 + n), hash(conversation), hash(visitor), hash(network)],
  );
  return r.rows[0]!.ok;
}
async function record(n: number, state = "measured", eur = 500, scope = "monthly") {
  return db.query(
    "select public.nona_record_model_observation($1,$2,$3,2500,180,340000,$4,'gen_synthetic',100)",
    [id(1000 + n), scope, state, eur],
  );
}
it("does not activate either ledger, rejects expired approval, null hashes and unpublished properties", async () => {
  expect(await reserve(1)).toBe(false);
  await enable();
  await db.exec("update public.properties set status='draft' where id='" + id(1) + "'");
  expect(await reserve(2)).toBe(false);
  expect(
    (
      await db.query<{ ok: boolean }>(
        "select public.nona_reserve_cloud_attempt($1,$2,null,$3,$4) ok",
        [id(2), id(1003), hash(1), hash(2)],
      )
    ).rows[0]!.ok,
  ).toBe(false);
  await db.exec("update public.nona_cloud_policy set approved_until=now()-interval '1 second'");
  expect(await reserve(3, 2)).toBe(false);
  expect(
    (await db.query<{ enabled: boolean }>("select enabled from public.nona_ai_authorization"))
      .rows[0]!.enabled,
  ).toBe(false);
});
it("serializes reservations across callers and refuses before crossing the exact monthly cap", async () => {
  await enable(60000);
  const results = await Promise.all(
    Array.from({ length: 20 }, (_, i) => reserve(i + 1, 1 + (i % 12))),
  );
  expect(results.filter(Boolean)).toHaveLength(3);
  expect(
    (
      await db.query<{ reserved_micros: number }>(
        "select reserved_micros from public.nona_cloud_month",
      )
    ).rows[0]!.reserved_micros,
  ).toBe(60000);
});
it("releases only verified monthly headroom once; estimates, missing bills and TEST retain full holds", async () => {
  await enable(40000);
  expect(await reserve(1)).toBe(true);
  await record(1);
  await record(1);
  expect(
    (
      await db.query<{ reserved_micros: number }>(
        "select reserved_micros from public.nona_cloud_month",
      )
    ).rows[0]!.reserved_micros,
  ).toBe(500);
  expect(await reserve(2)).toBe(true);
  await record(2, "estimated");
  expect(await reserve(3)).toBe(false);
  await db.exec(
    "update public.nona_ai_authorization set enabled=true,expires_at=now()+interval '1 hour'",
  );
  await db.query("select public.nona_reserve_concierge_attempt($1,$2,$3,$4)", [
    id(1),
    id(1099),
    hash(99),
    hash(99),
  ]);
  await record(99, "measured", 500, "test");
  expect(
    (
      await db.query<{ reserved_micros: number }>(
        "select reserved_micros from public.nona_ai_authorization",
      )
    ).rows[0]!.reserved_micros,
  ).toBe(20000);
});
it("enforces organization, property, visitor, conversation and network limits durably", async () => {
  await enable();
  await db.exec(
    "update public.nona_cloud_policy set property_daily_calls=3,organization_daily_calls=10,visitor_daily_calls=2,conversation_calls=2",
  );
  expect(await reserve(1, 1, 1, 1)).toBe(true);
  expect(await reserve(2, 1, 1, 2)).toBe(true);
  expect(await reserve(3, 1, 1, 3)).toBe(false);
  expect(await reserve(4, 2, 4, 1)).toBe(true);
  expect(await reserve(5, 2, 5, 1)).toBe(false);
  expect(await reserve(6, 1)).toBe(true);
  expect(await reserve(7, 1)).toBe(false);
  await db.exec(
    "update public.nona_cloud_policy set property_daily_calls=100,organization_daily_calls=100",
  );
  for (let n = 20; n < 30; n++) expect(await reserve(n, 3, n, n, 999)).toBe(true);
  expect(await reserve(30, 4, 30, 30, 999)).toBe(false);
});
it("blocks anonymous/authenticated ledger access and records no guest text or secrets", async () => {
  await enable();
  for (const role of ["anon", "authenticated"]) {
    await db.exec("set role " + role);
    await expect(reserve(1)).rejects.toThrow(/permission denied/);
    await expect(db.query("select * from public.nona_model_observation")).rejects.toThrow(
      /permission denied/,
    );
    await db.exec("reset role");
  }
  const columns = await db.query<{ column_name: string }>(
    "select column_name from information_schema.columns where table_name='nona_model_observation'",
  );
  expect(columns.rows.map((c) => c.column_name).join(" ")).not.toMatch(
    /prompt|message|reply|email|password|receipt/,
  );
});

it("allows the server to inspect readiness and execute quotas but cannot arm its own budget", async () => {
  await db.exec("set role service_role");
  expect((await db.query("select enabled from public.nona_cloud_policy")).rows).toHaveLength(1);
  expect(
    (await db.query("select request_id from public.nona_model_observation limit 0")).rows,
  ).toHaveLength(0);
  expect(await reserve(1)).toBe(false);
  await expect(db.query("update public.nona_cloud_policy set enabled=true")).rejects.toThrow(
    /permission denied/,
  );
  await db.exec("reset role");
});
it("refuses duplicate requests and stops future calls if billing breaks its reserved bound", async () => {
  await enable();
  expect(await reserve(1)).toBe(true);
  expect(await reserve(1)).toBe(false);
  await record(1, "measured", 20001);
  expect(await reserve(2)).toBe(false);
});

it("counts one organization across different properties", async () => {
  await enable();
  await db.query("update public.properties set organization_id=$1 where id=$2", [id(101), id(2)]);
  await db.exec("update public.nona_cloud_policy set organization_daily_calls=2");
  expect(await reserve(1, 1)).toBe(true);
  expect(await reserve(2, 2)).toBe(true);
  expect(await reserve(3, 2)).toBe(false);
  expect(await reserve(4, 3)).toBe(true);
});

it("settles a late provider bill against its original UTC month", async () => {
  await enable();
  expect(await reserve(1)).toBe(true);
  await db.exec(
    "insert into public.nona_cloud_month values((date_trunc('month',now() at time zone 'UTC')-interval '1 month')::date,20000)",
  );
  await db.query(
    "insert into public.nona_cloud_usage(request_id,organization_id,property_id,conversation_hash,visitor_hash,network_hash,created_at) values($1,$2,$3,$4,$5,$6,date_trunc('month',now())-interval '1 day')",
    [id(1088), id(101), id(1), hash(88), hash(88), hash(88)],
  );
  await record(88, "measured", 500);
  const months = await db.query<{ reserved_micros: number }>(
    "select reserved_micros from public.nona_cloud_month order by month_start",
  );
  expect(months.rows.map((r) => r.reserved_micros)).toEqual([500, 20000]);
});
