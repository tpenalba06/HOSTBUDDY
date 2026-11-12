import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { expect, it } from "vitest";

it("billing policy can migrate and reconcile archive/deletion before 0021 exists", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; CREATE SCHEMA storage;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
 CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid() PRIMARY KEY,bucket_id text,name text);
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$ SELECT (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
 GRANT USAGE ON SCHEMA auth,storage TO authenticated,anon,service_role;
 GRANT ALL ON storage.objects TO authenticated,service_role;`);
    const dir = new URL("../../../drizzle/migrations/", import.meta.url);
    for (const file of readdirSync(dir)
      .filter((x) => /^\d{4}_.+\.sql$/.test(x) && !x.startsWith("0021_"))
      .sort())
      await db.exec(readFileSync(new URL(file, dir), "utf8"));

    // Out-of-order prerequisite can be replayed safely by the later formal chain.
    await db.exec(readFileSync(new URL("0022_paid_billing_capacity.sql", dir), "utf8"));
    const org = "90000000-0000-4000-8000-000000000001";
    const lease = "90000000-0000-4000-8000-000000000002";
    await db.exec(`INSERT INTO organizations(id,name) VALUES('${org}','Isolated billing');
      INSERT INTO organization_payment_accounts(organization_id,stripe_subscription_id) VALUES('${org}','sub_synthetic');
      INSERT INTO properties(organization_id,name,slug) SELECT '${org}', 'Fixture '||i,'isolated-'||i FROM generate_series(1,14) AS i;`);
    const first = await db.query(`SELECT claim_billing_sync('${org}','${lease}') AS job`);
    expect(first.rows[0]).toMatchObject({ job: { propertyCount: 14 } });
    const state = {
      subscriptionId: "sub_synthetic",
      periodStart: 100,
      periodEnd: 200,
      paidCapacity: 14,
      renewalQuantity: 13,
      scheduleId: "sched_synthetic",
      invoiceId: "in_synthetic",
    };
    await db.exec(`SELECT record_billing_capacity('${org}','${lease}',14,'${JSON.stringify(state)}'::jsonb);
      SELECT refresh_billing_sync_lease('${org}','${lease}');
      SELECT complete_billing_sync('${org}','${lease}',14,NULL);
      UPDATE properties SET status='archived' WHERE slug='isolated-14';`);
    expect(
      (await db.query(`SELECT claim_billing_sync('${org}','${lease}') AS job`)).rows[0],
    ).toMatchObject({ job: { propertyCount: 13 } });
    await db.exec(`SELECT complete_billing_sync('${org}','${lease}',15,NULL);
      UPDATE properties SET status='draft' WHERE slug='isolated-14';
      DELETE FROM properties WHERE slug='isolated-14';`);
    expect(
      (await db.query(`SELECT claim_billing_sync('${org}','${lease}') AS job`)).rows[0],
    ).toMatchObject({ job: { propertyCount: 13 } });
    expect(
      (await db.query(`SELECT paid_capacity,renewal_quantity FROM organization_billing_capacity`))
        .rows,
    ).toEqual([{ paid_capacity: 14, renewal_quantity: 13 }]);
    expect(
      (await db.query(`SELECT to_regclass('public.property_deletion_cleanup') AS absent`)).rows,
    ).toEqual([{ absent: null }]);
  } finally {
    await db.close();
  }
}, 60000);
