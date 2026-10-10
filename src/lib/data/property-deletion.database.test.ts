import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, afterAll, beforeEach, afterEach, expect, it } from "vitest";
let db: PGlite;
const org = "10000000-0000-4000-8000-000000000001";
const other = "10000000-0000-4000-8000-000000000002";
const uid = "20000000-0000-4000-8000-000000000001";
const p1 = "30000000-0000-4000-8000-000000000001";
const p2 = "30000000-0000-4000-8000-000000000002";
const section = "40000000-0000-4000-8000-000000000001";
const service = "50000000-0000-4000-8000-000000000001";
const globalService = "50000000-0000-4000-8000-000000000002";
const order = "60000000-0000-4000-8000-000000000001";
const conversation = "70000000-0000-4000-8000-000000000001";
const query = async (sql: string) => (await db.query(sql)).rows;
const rejected = async (sql: string, message?: string) => {
  await db.exec("SAVEPOINT expected_rejection");
  try {
    await expect(query(sql)).rejects.toThrow(message);
  } finally {
    await db.exec("ROLLBACK TO expected_rejection; RELEASE expected_rejection;");
  }
};
beforeAll(async () => {
  db = new PGlite();
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
    .filter((x) => /^\d{4}_.+\.sql$/.test(x))
    .sort())
    await db.exec(readFileSync(new URL(file, dir), "utf8"));
}, 60000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.exec(`BEGIN;
 INSERT INTO auth.users(id,email) VALUES('${uid}','synthetic@example.invalid');
 INSERT INTO organizations(id,name) VALUES('${org}','Synthetic'),('${other}','Other');
 INSERT INTO organization_members(organization_id,user_id,role) VALUES('${org}','${uid}','owner');
 SELECT set_config('request.jwt.claim.sub','${uid}',true);
 INSERT INTO properties(id,organization_id,name,slug) VALUES('${p1}','${org}','Delete me','delete-me'),('${p2}','${org}','Keep me','keep-me');
 INSERT INTO guide_sections(id,property_id,section_key,title) VALUES('${section}','${p1}','welcome','Welcome');
 INSERT INTO guide_sections(property_id,section_key,title) VALUES('${p2}','welcome','Welcome');`);
});
afterEach(async () => {
  await db.exec("ROLLBACK;");
});
it.each(["owner", "admin"])(
  "%s deletes linked data atomically and restores free publication with two unpaid properties",
  async (role) => {
    await db.exec(`UPDATE organization_members SET role='${role}';
 INSERT INTO property_fields(property_id,key,category,label) VALUES('${p1}','wifi','wifi','Wi-Fi');
 INSERT INTO section_media(organization_id,property_id,section_id,media_type,storage_path,mime_type,file_size)
 VALUES('${org}','${p1}','${section}','image','${org}/${p1}/photo.jpg','image/jpeg',100);
 INSERT INTO storage.objects(bucket_id,name) VALUES('guide-media','${org}/${p1}/photo.jpg'),('guide-media','${org}/${p1}/orphan.jpg'),('guide-media','${org}/${p2}/keep.jpg'),('other','${org}/${p1}/other-bucket.jpg');
 INSERT INTO property_messaging_settings(property_id) VALUES('${p1}');
 INSERT INTO property_review_settings(property_id) VALUES('${p1}');
 INSERT INTO property_review_destinations(property_id,label,url) VALUES('${p1}','Review','https://example.com');
 INSERT INTO services(id,organization_id,property_id,name,price) VALUES('${service}','${org}','${p1}','Local',0),('${globalService}','${org}',NULL,'Global',0);
 INSERT INTO orders(id,organization_id,property_id,service_id,total_amount) VALUES('${order}','${org}','${p1}','${service}',0);
 INSERT INTO order_payments(organization_id,order_id,stripe_account_id,amount_cents,token_hash,status) VALUES('${org}','${order}','acct_fixture',100,'synthetic-hash','paid');
 INSERT INTO guest_feedback(organization_id,property_id,rating,comment) VALUES('${org}','${p1}',5,'Test');
 INSERT INTO conversations(id,organization_id,property_id,guest_display_name) VALUES('${conversation}','${org}','${p1}','Test');
 INSERT INTO messages(conversation_id,sender_type,body) VALUES('${conversation}','guest','Test');
 INSERT INTO import_runs(organization_id,property_id,source_type) VALUES('${org}','${p1}','text');
 INSERT INTO provider_import_links(organization_id,provider,external_id,property_id) VALUES('${org}','guesty','synthetic','${p1}');
 INSERT INTO guide_section_translations(section_id,locale,title,source_updated_at) VALUES('${section}','en','Welcome',now());
 INSERT INTO guest_conversation_sessions(conversation_id,token_hash) VALUES('${conversation}',repeat('a',64));
 INSERT INTO organization_payment_accounts(organization_id,stripe_subscription_id,subscription_status,current_period_end)
 VALUES('${org}','sub_synthetic','active',now()+interval '1 month');
 UPDATE organization_billing_sync SET synced_revision=revision WHERE organization_id='${org}';
 SELECT publish_property('${p1}');
 DELETE FROM organization_payment_accounts WHERE organization_id='${org}';`);
    expect(await query(`SELECT get_public_guide('delete-me') AS guide`)).toEqual([
      { guide: expect.any(Object) },
    ]);
    await rejected(`SELECT publish_property('${p2}')`, "hb_subscription_required");
    await db.exec("SET LOCAL ROLE authenticated;");
    const rows = await query(`SELECT delete_property_permanently('${p1}','Delete me') AS job`);
    expect(rows).toHaveLength(1);
    await db.exec("RESET ROLE;");
    for (const table of [
      "property_fields",
      "guide_sections",
      "section_media",
      "property_messaging_settings",
      "property_review_settings",
      "property_review_destinations",
      "services",
      "orders",
      "guest_feedback",
      "conversations",
      "import_runs",
      "provider_import_links",
      "property_publications",
    ])
      expect(await query(`SELECT 1 FROM ${table} WHERE property_id='${p1}'`), table).toHaveLength(
        0,
      );
    expect(
      await query(`SELECT 1 FROM messages WHERE conversation_id='${conversation}'`),
    ).toHaveLength(0);
    expect(
      await query(
        `SELECT 1 FROM guest_conversation_sessions WHERE conversation_id='${conversation}'`,
      ),
    ).toHaveLength(0);
    expect(
      await query(`SELECT 1 FROM guide_section_translations WHERE section_id='${section}'`),
    ).toHaveLength(0);
    expect(await query(`SELECT 1 FROM services WHERE id='${globalService}'`)).toHaveLength(1);
    expect(
      await query(`SELECT 1 FROM order_payments WHERE order_id IS NULL AND status='paid'`),
    ).toHaveLength(1);
    const jobs = await query(
      `SELECT paths FROM property_deletion_cleanup WHERE property_id='${p1}'`,
    );
    expect(jobs[0]).toEqual({
      paths: expect.arrayContaining([`${org}/${p1}/photo.jpg`, `${org}/${p1}/orphan.jpg`]),
    });
    expect((jobs[0] as { paths: string[] }).paths).toHaveLength(2);
    expect(
      await query(
        `SELECT 1 FROM organization_billing_sync WHERE organization_id='${org}' AND pending`,
      ),
    ).toHaveLength(1);
    await db.exec("SET LOCAL ROLE authenticated;");
    await query(`SELECT publish_property('${p2}')`);
    expect(await query(`SELECT 1 FROM properties WHERE organization_id='${org}'`)).toHaveLength(1);
    expect(await query(`SELECT get_public_guide('keep-me') AS guide`)).toEqual([
      { guide: expect.any(Object) },
    ]);
    expect(await query(`SELECT get_public_guide('delete-me') AS guide`)).toEqual([{ guide: null }]);
  },
);
it.each(["member", "other tenant", "anonymous", "wrong name"])(
  "rejects %s without deleting data or queuing cleanup",
  async (kind) => {
    if (kind === "member") await db.exec(`UPDATE organization_members SET role='member'`);
    if (kind === "other tenant")
      await db.exec(`UPDATE organization_members SET organization_id='${other}'`);
    if (kind === "anonymous") await db.exec(`SELECT set_config('request.jwt.claim.sub','',true)`);
    await db.exec("SET LOCAL ROLE authenticated;");
    await rejected(
      `SELECT delete_property_permanently('${p1}','${kind === "wrong name" ? "Wrong" : "Delete me"}')`,
    );
    await db.exec("RESET ROLE;");
    expect(await query(`SELECT 1 FROM properties WHERE id='${p1}'`)).toHaveLength(1);
    expect(await query("SELECT 1 FROM property_deletion_cleanup")).toHaveLength(0);
  },
);
it("denies direct REST deletion even for an owner", async () => {
  await db.exec("SET LOCAL ROLE authenticated;");
  await rejected(`DELETE FROM properties WHERE id='${p1}'`, "permission denied");
});
it("preserves files referenced by global services", async () => {
  await db.exec(`INSERT INTO services(id,organization_id,name,price,image_path) VALUES('${globalService}','${org}','Global',0,'${org}/${p1}/shared.jpg');
 INSERT INTO storage.objects(bucket_id,name) VALUES('guide-media','${org}/${p1}/shared.jpg');`);
  const rows = await query(`SELECT delete_property_permanently('${p1}','Delete me') AS job`);
  expect((rows[0] as { job: { paths: string[] } }).job.paths).toEqual([]);
});

it("rolls back all deletion work if an unrelated property order references the targeted service", async () => {
  // Synthetic legacy inconsistency: bypass only the fixture's ownership trigger, then restore it.
  await db.exec(`ALTER TABLE orders DISABLE TRIGGER validate_order_ownership_before_write;
 INSERT INTO services(id,organization_id,property_id,name,price) VALUES('${service}','${org}','${p1}','Local',0);
 INSERT INTO orders(id,organization_id,property_id,service_id,total_amount) VALUES('${order}','${org}','${p2}','${service}',0);
 INSERT INTO provider_import_links(organization_id,provider,external_id,property_id) VALUES('${org}','guesty','keep-on-failure','${p1}');
 ALTER TABLE orders ENABLE TRIGGER validate_order_ownership_before_write;`);
  await rejected(`SELECT delete_property_permanently('${p1}','Delete me')`);
  expect(await query(`SELECT 1 FROM properties WHERE id='${p1}'`)).toHaveLength(1);
  expect(
    await query(`SELECT 1 FROM orders WHERE id='${order}' AND property_id='${p2}'`),
  ).toHaveLength(1);
  expect(await query(`SELECT 1 FROM provider_import_links WHERE property_id='${p1}'`)).toHaveLength(
    1,
  );
  expect(await query("SELECT 1 FROM property_deletion_cleanup")).toHaveLength(0);
});
it("retries the same cleanup job after DB deletion; member/other tenant cannot retrieve it", async () => {
  const first = await query(`SELECT delete_property_permanently('${p1}','Delete me') AS job`);
  expect(await query(`SELECT delete_property_permanently('${p1}','Delete me') AS job`)).toEqual(
    first,
  );
  await db.exec(`UPDATE organization_members SET role='member'; SET LOCAL ROLE authenticated;`);
  expect(await query(`SELECT 1 FROM property_deletion_cleanup`)).toHaveLength(0);
  await rejected(`SELECT delete_property_permanently('${p1}','Delete me')`);
});
it("refuses late uploads to the deleted property while allowing another property upload", async () => {
  await query(`SELECT delete_property_permanently('${p1}','Delete me')`);
  await rejected(
    `INSERT INTO storage.objects(bucket_id,name) VALUES('guide-media','${org}/${p1}/late.jpg')`,
    "property unavailable",
  );
  await query(
    `INSERT INTO storage.objects(bucket_id,name) VALUES('guide-media','${org}/${p2}/ok.jpg')`,
  );
});

// Synthetic DB verification for the independent billing migration (never run against TEST).
it("billing capacity persists its high-water mark and rejects stale leases/period regressions", async () => {
  const lease = "80000000-0000-4000-8000-000000000001";
  await db.exec(`INSERT INTO organization_payment_accounts(organization_id,stripe_subscription_id) VALUES('${org}','sub_synthetic');
    SELECT claim_billing_sync('${org}','${lease}');`);
  const state = {
    subscriptionId: "sub_synthetic",
    periodStart: 100,
    periodEnd: 200,
    paidCapacity: 14,
    renewalQuantity: 13,
    scheduleId: "sched_synthetic",
    invoiceId: "in_synthetic",
  };
  const record = (value = state, token = lease) =>
    `SELECT record_billing_capacity('${org}','${token}',2,'${JSON.stringify(value)}'::jsonb)`;
  await query(record());
  expect(
    await query(
      `SELECT paid_capacity,renewal_quantity FROM organization_billing_capacity WHERE organization_id='${org}'`,
    ),
  ).toEqual([{ paid_capacity: 14, renewal_quantity: 13 }]);
  await rejected(record({ ...state, paidCapacity: 13 }), "billing capacity regression");
  await rejected(record(state, "80000000-0000-4000-8000-000000000002"), "billing lease expired");
  await query(record({ ...state, periodStart: 200, periodEnd: 300, paidCapacity: 13 }));
  expect(
    await query(
      `SELECT paid_capacity FROM organization_billing_capacity WHERE organization_id='${org}'`,
    ),
  ).toEqual([{ paid_capacity: 13 }]);
  await db.exec("SET LOCAL ROLE authenticated");
  await rejected(record(), "permission denied");
  await rejected(`SELECT * FROM organization_billing_capacity`, "permission denied");
  await db.exec("RESET ROLE");
});
it.each(["archive", "delete"])(
  "%s produces the same authoritative billable count",
  async (action) => {
    await db.exec(
      action === "archive"
        ? `UPDATE properties SET status='archived' WHERE id='${p1}'`
        : `DELETE FROM properties WHERE id='${p1}'`,
    );
    const rows = await query(
      `SELECT claim_billing_sync('${org}','80000000-0000-4000-8000-000000000001') AS job`,
    );
    expect(rows[0]).toMatchObject({ job: { propertyCount: 1 } });
  },
);
