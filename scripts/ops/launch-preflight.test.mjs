import test from "node:test";
import assert from "node:assert/strict";
import { preflight } from "./launch-preflight.mjs";
const ref = "abcdefghijklmnopqrst",
  url = "https://nona.example";
const env = {
  SUPABASE_PROJECT_ID: ref,
  VITE_SUPABASE_PROJECT_ID: ref,
  SUPABASE_URL: `https://${ref}.supabase.co`,
  VITE_SUPABASE_URL: `https://${ref}.supabase.co`,
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_fixture",
  STRIPE_SECRET_KEY: "sk_live_fixture",
  STRIPE_PRICE_BASE: "price_base",
  STRIPE_PRICE_EXTRA: "price_extra",
  STRIPE_WEBHOOK_SECRET: "whsec_billing",
  STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_connect",
  BILLING_SYNC_SECRET: "x".repeat(32),
  HOSTBUDDY_APP_URL: url,
  HOSTBUDDY_CONNECT_APP_URL: url,
  STRIPE_LIVE_VERIFIED: "false",
};
test("prepared inputs never imply activation or live verification", () => {
  const r = preflight(env, ref, url);
  assert.equal(r.state, "INPUTS_PREPARED");
  assert.equal(r.activated, false);
  assert.ok(r.remainingEvidence.includes("manager_live_capabilities"));
});
test("reject mixed targets and preserved TEST destinations", () => {
  assert.ok(
    preflight(env, "mhhtnqfdkyudwyqlmnce", url).blockers.includes("production_target_required"),
  );
  assert.ok(
    preflight(
      { ...env, VITE_SUPABASE_URL: "https://mhhtnqfdkyudwyqlmnce.supabase.co" },
      ref,
      url,
    ).blockers.includes("backend_target_mismatch"),
  );
  assert.ok(
    preflight(
      { ...env, HOSTBUDDY_CONNECT_APP_URL: "https://id-preview--test.lovable.app" },
      ref,
      url,
    ).blockers.includes("return_origin_mismatch"),
  );
});
test("reject absent scheduler, test Stripe and merged webhooks", () => {
  const r = preflight(
    {
      ...env,
      STRIPE_SECRET_KEY: "sk_test_fixture",
      BILLING_SYNC_SECRET: "",
      STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_billing",
    },
    ref,
    url,
  );
  for (const code of [
    "stripe_live_input_missing",
    "billing_scheduler_secret_missing",
    "separate_webhook_secrets_required",
  ])
    assert.ok(r.blockers.includes(code));
});
test("reject frontend secret and unexpected activation, output only fixed codes", () => {
  const r = preflight(
    { ...env, VITE_PRIVATE: "sk_live_super_sensitive", STRIPE_LIVE_VERIFIED: "true" },
    ref,
    url,
  );
  assert.ok(r.blockers.includes("frontend_secret_rejected"));
  assert.ok(r.blockers.includes("live_activation_not_authorized"));
  assert.ok(!JSON.stringify(r).includes("super_sensitive"));
});
test("reject service role JWT in public inputs", () => {
  const jwt =
    "eyJheader." +
    Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url") +
    ".signature";
  assert.ok(
    preflight({ ...env, VITE_LEGACY: jwt }, ref, url).blockers.includes("frontend_secret_rejected"),
  );
});
