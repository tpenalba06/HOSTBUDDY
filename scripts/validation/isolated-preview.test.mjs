import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, chmodSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadCredentials,
  isolatedEnvironment,
  verifyTarget,
  TEST_REF,
  TEST_URL,
} from "./isolated-preview.mjs";

test("source credentials, Stripe and outgoing transports cannot enter the TEST process", () => {
  const fixture = { publicKey: "sb_publishable_fixture", serverKey: "sb_secret_fixture" };
  const env = isolatedEnvironment(
    {
      PATH: "/bin",
      SUPABASE_URL: "https://source.example",
      SUPABASE_SERVICE_ROLE_KEY: "source-secret",
      STRIPE_SECRET_KEY: "financial-secret",
      SMTP_PASSWORD: "smtp-secret",
      VITE_ACCIDENTAL_SECRET: "secret",
      OPERATIONAL_ALERT_TOKEN: "alert-secret",
    },
    fixture,
  );
  assert.equal(env.SUPABASE_URL, TEST_URL);
  assert.equal(env.VITE_SUPABASE_URL, TEST_URL);
  assert.equal(env.SUPABASE_SERVICE_ROLE_KEY, fixture.serverKey);
  assert.equal(env.VITE_SUPABASE_PUBLISHABLE_KEY, fixture.publicKey);
  assert.equal(env.VITE_SUPABASE_PROJECT_ID, TEST_REF);
  for (const name of [
    "STRIPE_SECRET_KEY",
    "SMTP_PASSWORD",
    "VITE_ACCIDENTAL_SECRET",
    "OPERATIONAL_ALERT_TOKEN",
  ])
    assert.equal(env[name], undefined);
  assert.throws(
    () => isolatedEnvironment({}, fixture, "source-project"),
    /isolated_test_identity_required/,
  );
});

test("private key files refuse insecure permissions and symlink substitution", () => {
  const dir = mkdtempSync(join(tmpdir(), "nona-credentials-fixture-"));
  try {
    writeFileSync(join(dir, "api-publishable"), "sb_publishable_fixture", { mode: 0o600 });
    writeFileSync(join(dir, "api-secret"), "sb_secret_fixture", { mode: 0o600 });
    assert.equal(loadCredentials(dir).serverKey, "sb_secret_fixture");
    chmodSync(join(dir, "api-secret"), 0o644);
    assert.throws(() => loadCredentials(dir), /private_test_key_file_required/);
    rmSync(join(dir, "api-secret"));
    symlinkSync(join(dir, "api-publishable"), join(dir, "api-secret"));
    assert.throws(() => loadCredentials(dir), /private_test_key_file_required/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("preflight refuses enabled signup, HTTP failure and redirects", async () => {
  const key = { publicKey: "sb_publishable_fixture", serverKey: "sb_secret_fixture" };
  await assert.rejects(
    verifyTarget(key, async () => new Response('{"disable_signup":false}')),
    /test_signup_must_be_disabled/,
  );
  await assert.rejects(
    verifyTarget(key, async () => new Response("", { status: 403 })),
    /isolated_test_preflight_failed/,
  );
  const result = await verifyTarget(key, async (url, init) => {
    assert.equal(init.redirect, "error");
    assert.equal(init.headers.Authorization, undefined);
    if (url === TEST_URL + "/auth/v1/settings") {
      assert.equal(init.headers.apikey, key.publicKey);
      return new Response('{"disable_signup":true}');
    }
    assert.equal(url, TEST_URL + "/storage/v1/bucket");
    assert.equal(init.headers.apikey, key.serverKey);
    return new Response('[{"id":"guide-media","public":false}]');
  });
  assert.equal(result.signupDisabled, true);
  await assert.rejects(
    verifyTarget(
      key,
      async (url) =>
        new Response(
          url.endsWith("/settings")
            ? '{"disable_signup":true}'
            : '[{"id":"guide-media","public":true}]',
        ),
    ),
    /test_private_media_bucket_required/,
  );
});
