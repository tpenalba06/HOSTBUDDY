import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('new TEST receiver: service-only access, fixed payload and global cap', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
  await db.exec(readFileSync(new URL('./test-alert-receiver.sql', import.meta.url), 'utf8'));
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`SET ROLE ${role}`);
    await assert.rejects(db.query("SELECT public.nona_report_operational_alert('hostbuddy.operations.v1','server_request_failed','error',now())"), /permission denied/);
    await assert.rejects(db.query("SELECT public.nona_read_operational_alerts(now() - interval '1 hour')"), /permission denied/);
    await assert.rejects(db.query('SELECT * FROM nona_ops_private.alerts'), /permission denied/);
    await db.exec('RESET ROLE');
  }
  await db.exec('SET ROLE service_role');
  await assert.rejects(db.query("SELECT public.nona_report_operational_alert('private-body','server_request_failed','error',now())"), /invalid_operational_event/);
  await assert.rejects(db.query("SELECT public.nona_report_operational_alert('hostbuddy.operations.v1','server_request_failed','error',now() - interval '1 day')"), /invalid_operational_event/);
  for (let i = 0; i < 2; i++) {
    const r = await db.query("SELECT public.nona_report_operational_alert('hostbuddy.operations.v1','server_request_failed','error',now()) AS receipt");
    assert.equal(r.rows[0].receipt.received, true);
  }
  const inbox = await db.query("SELECT public.nona_read_operational_alerts(now() - interval '1 hour') AS summary");
  assert.equal(inbox.rows[0].summary.count, 1);
  assert.equal(inbox.rows[0].summary.environment, 'isolated-test');
  await assert.rejects(db.query("SELECT public.nona_read_operational_alerts(now() - interval '9 days')"), /invalid_alert_window/);
});
