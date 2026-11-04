// New service catalogue integration only. In-memory PostgreSQL; no remote
// credentials, Stripe request, old financial recipe or restoration scenario.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("service catalogue: assignments, authoritative option quote, deduplication, receipt and tenant boundary", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role; CREATE SCHEMA auth; CREATE SCHEMA storage;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email varchar,email_confirmed_at timestamptz,raw_app_meta_data jsonb,raw_user_meta_data jsonb);
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),auth.jwt()->>'sub')::uuid $$;
 CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
 GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated,service_role; GRANT ALL ON storage.objects TO authenticated,service_role;`);
  const directory = new URL("../../drizzle/migrations/", import.meta.url);
  for (const file of readdirSync(directory)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort())
    await db.exec(readFileSync(new URL(file, directory), "utf8"));
  const user = "11111111-1111-4111-8111-111111111111",
    org = "22222222-2222-4222-8222-222222222222",
    other = "22222222-2222-4222-8222-222222222223",
    p = "33333333-3333-4333-8333-333333333333",
    p2 = "33333333-3333-4333-8333-333333333334",
    foreign = "33333333-3333-4333-8333-333333333335",
    service = "44444444-4444-4444-8444-444444444444",
    option = "55555555-5555-4555-8555-555555555555",
    request = "66666666-6666-4666-8666-666666666666",
    receipt = "a".repeat(64);
  // Only local fixtures bypass the already acquired publication/Billing gate.
  await db.exec(
    `INSERT INTO auth.users(id,email) VALUES('${user}','service-fixture@example.invalid'); INSERT INTO public.organizations(id,name) VALUES('${org}','SERVICE TEST A'),('${other}','SERVICE TEST B'); INSERT INTO public.organization_members(organization_id,user_id,role) VALUES('${org}','${user}','owner'); SELECT set_config('request.jwt.claim.sub','${user}',false); ALTER TABLE public.properties DISABLE TRIGGER properties_publication_billing_gate; INSERT INTO public.properties(id,organization_id,name,slug,status) VALUES('${p}','${org}','A','services-a','published'),('${p2}','${org}','A2','services-a2','published'),('${foreign}','${other}','B','services-b','published'); ALTER TABLE public.properties ENABLE TRIGGER properties_publication_billing_gate; INSERT INTO public.property_publications(property_id,organization_id,guide) SELECT id,organization_id,jsonb_build_object('id',id,'name',name,'sections','[]'::jsonb,'services','[]'::jsonb) FROM public.properties;`,
  );
  const slot = new Date(Date.now() + 86400000).toISOString();
  const config = {
    maxQuantity: 3,
    requestDate: true,
    slots: [slot],
    seller: "Synthetic TEST seller",
    cancellation: "Synthetic TEST terms",
    options: [{ id: option, label: "Synthetic extra", priceCents: 250 }],
  };
  await db.exec("SET ROLE authenticated");
  const managerPayload = {
    name: "Synthetic service",
    description: "Fixture",
    price: 10,
    pricing_type: "fixed",
    is_active: true,
    property_ids: [p, p2],
    booking_config: config,
    image_paths: {},
  };
  await db.query("SELECT public.save_service_catalog($1,$2,$3,$4)", [
    org,
    p,
    service,
    JSON.stringify(managerPayload),
  ]);
  await db.query("SELECT public.save_service_catalog($1,$2,$3,$4)", [
    org,
    p,
    service,
    JSON.stringify(managerPayload),
  ]);
  await assert.rejects(
    db.query("SELECT public.save_service_catalog($1,$2,$3,$4)", [
      other,
      foreign,
      service,
      JSON.stringify(managerPayload),
    ]),
    /not allowed/,
  );
  await db.exec("RESET ROLE");
  assert.equal(
    (await db.query("SELECT count(*) AS count FROM public.services WHERE id=$1", [service])).rows[0]
      .count,
    1,
  );
  const guide = async (slug) =>
    (await db.query("SELECT public.get_public_guide($1) AS guide", [slug])).rows[0].guide;
  assert.equal((await guide("services-a")).services.length, 1);
  assert.equal((await guide("services-a2")).services.length, 1);
  assert.equal((await guide("services-b")).services.length, 0);
  await assert.rejects(
    db.query("UPDATE public.services SET property_ids=$1 WHERE id=$2", [[foreign], service]),
    /invalid service ownership/,
  );
  const revision = (await guide("services-a")).services[0].revision;
  const args = [
    "services-a",
    service,
    "Synthetic guest",
    "guest@example.invalid",
    2,
    slot,
    "new-services-test",
    request,
    receipt,
    option,
    "Synthetic reservation details",
    true,
    revision,
  ];
  const submit = async (args) =>
    (
      await db.query(
        "SELECT public.submit_service_booking($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) AS booking",
        args,
      )
    ).rows[0].booking;
  await db.exec("SET ROLE service_role");
  const booked = await submit(args);
  assert.equal(Number(booked.amount), 25);
  assert.equal(booked.status, "pending");
  assert.deepEqual(await submit(args), booked);
  await assert.rejects(submit(args.map((v, i) => (i === 4 ? 3 : v))), /booking request conflict/);
  await assert.rejects(
    submit(
      args.map((v, i) => (i === 7 ? "77777777-7777-4777-8777-777777777777" : i === 9 ? null : v)),
    ),
    /service option required/,
  );
  await assert.rejects(
    submit(
      args.map((v, i) =>
        i === 7
          ? "77777777-7777-4777-8777-777777777777"
          : i === 5
            ? new Date(Date.now() + 172800000).toISOString()
            : v,
      ),
    ),
    /slot unavailable/,
  );
  await assert.rejects(
    submit(
      args.map((value, index) =>
        index === 7
          ? "77777777-7777-4777-8777-777777777777"
          : index === 12
            ? "2000-01-01T00:00:00Z"
            : value,
      ),
    ),
    /service quote changed/,
  );
  const read = async (hash) =>
    (await db.query("SELECT public.read_service_booking($1,$2) AS receipt", [booked.id, hash]))
      .rows[0].receipt;
  assert.equal((await read(receipt)).paymentStatus, null);
  assert.equal(await read("b".repeat(64)), null);
  await db.exec("RESET ROLE; SET ROLE authenticated;");
  assert.equal(
    (await db.query("SELECT public.service_order_payment_states($1) AS states", [org])).rows[0]
      .states.length,
    0,
  );
  await assert.rejects(
    db.query("SELECT public.service_order_payment_states($1)", [other]),
    /not allowed/,
  );
  await assert.rejects(
    db.query("SELECT public.read_service_booking($1,$2)", [booked.id, receipt]),
    /permission denied/,
  );
  await db.query("UPDATE public.orders SET status='confirmed' WHERE id=$1", [booked.id]);
  await db.exec("RESET ROLE; SET ROLE service_role");
  assert.equal((await read(receipt)).status, "confirmed");
  await assert.rejects(
    db.query("UPDATE public.orders SET status='completed' WHERE id=$1", [booked.id]),
    /service payment pending/,
  );
  assert.equal((await read(receipt)).paymentStatus, null);
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.services SET is_active=false,deleted_at=now() WHERE id=$1", [
    service,
  ]);
  assert.equal((await guide("services-a")).services.length, 0);
  assert.equal(
    (await db.query("SELECT count(*) AS count FROM public.orders WHERE id=$1", [booked.id])).rows[0]
      .count,
    1,
  );
  console.log(
    "NEW_SERVICE_FLOW_PASS: same-tenant multi-property catalogue, server quote 25 EUR, one order on retry, private receipt, confirmed never means paid, soft delete retains order.",
  );
});
