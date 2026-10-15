import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeEach, afterEach, it, expect } from "vitest";
let db: PGlite;
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
beforeEach(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon; create role authenticated; create role service_role; create table public.properties(id uuid primary key,organization_id uuid,status text);",
  );
  for (let n = 1; n <= 12; n++)
    await db.query("insert into public.properties values($1,$2,'published')", [
      id(n),
      id(100 + Math.floor((n - 1) / 3)),
    ]);
  await db.exec(
    await readFile(
      new URL("../../drizzle/migrations/0024_concierge_budget.sql", import.meta.url),
      "utf8",
    ),
  );
});
afterEach(async () => db.close());
async function enable(cap = 4000000) {
  await db.query(
    "update public.nona_ai_authorization set enabled=true,expires_at=now()+interval '1 hour',cap_micros=$1",
    [cap],
  );
}
async function reserve(n: number, property = 1, conversation = n, fingerprint = n) {
  const r = await db.query<{ ok: boolean }>(
    "select public.nona_reserve_concierge_attempt($1,$2,$3,$4) ok",
    [
      id(property),
      id(1000 + n),
      String(conversation).padStart(64, "a"),
      String(fingerprint).padStart(64, "b"),
    ],
  );
  return r.rows[0]!.ok;
}
it("is disabled by default, rejects expired authorization and unknown properties", async () => {
  expect(await reserve(1)).toBe(false);
  await enable();
  expect(await reserve(2, 999)).toBe(false);
  await db.exec("update public.nona_ai_authorization set expires_at=now()-interval '1 second'");
  expect(await reserve(3)).toBe(false);
});
it("atomically stops shared concurrent reservations before the global 4 EUR envelope", async () => {
  await enable();
  const results = await Promise.all(
    Array.from({ length: 205 }, (_, n) => reserve(n + 1, 1 + (n % 12))),
  );
  expect(results.filter(Boolean)).toHaveLength(200);
  const r = await db.query<{ reserved_micros: number }>(
    "select reserved_micros from public.nona_ai_authorization",
  );
  expect(r.rows[0]!.reserved_micros).toBe(4000000);
});
it("does not replay a request on a second instance and never refunds uncertain calls", async () => {
  await enable(20000);
  expect(await reserve(1)).toBe(true);
  expect(await reserve(1)).toBe(false);
  expect(await reserve(2)).toBe(false);
});
it("enforces durable property, conversation and fingerprint quotas", async () => {
  await enable();
  for (let n = 1; n <= 10; n++) expect(await reserve(n, 1, n, 1)).toBe(true);
  expect(await reserve(11, 1, 11, 1)).toBe(false);
  for (let n = 20; n < 40; n++) expect(await reserve(n, 2, 999, n)).toBe(true);
  expect(await reserve(40, 2, 999, 40)).toBe(false);
  for (let n = 50; n < 70; n++) expect(await reserve(n, 1, n, n)).toBe(true);
  expect(await reserve(70, 1, 70, 70)).toBe(false);
});
it("cannot be called by anonymous guests and never stores conversation text", async () => {
  await enable();
  await db.exec("set role anon");
  await expect(reserve(1)).rejects.toThrow(/permission denied/);
  await db.exec("reset role");
  const columns = await db.query<{ column_name: string }>(
    "select column_name from information_schema.columns where table_name='nona_ai_usage'",
  );
  expect(columns.rows.map((c) => c.column_name)).not.toContain("message");
});
it("enforces the organization quota across multiple assigned properties", async () => {
  await enable();
  await db.query("insert into public.properties values($1,$2,'published')", [id(13), id(100)]);
  const properties = [1, 2, 3, 13];
  for (let n = 1; n <= 100; n++) expect(await reserve(n, properties[n % 4]!, n, n)).toBe(true);
  expect(await reserve(101, 13, 101, 101)).toBe(false);
});
