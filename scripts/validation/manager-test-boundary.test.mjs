import { test } from "node:test";
import assert from "node:assert/strict";
import {
  prepareManagerTestEnvironment,
  managerTestBoundary,
  TEST_BACKEND,
} from "./manager-test-boundary.mjs";

test("refuses production, foreign backend and project before running the app", () => {
  for (const change of [
    { VERCEL_ENV: "production" },
    { SUPABASE_URL: "https://foreign.invalid" },
    { VERCEL_PROJECT_ID: "foreign" },
  ])
    assert.equal(
      prepareManagerTestEnvironment(
        { VERCEL_ENV: "preview", SUPABASE_URL: TEST_BACKEND, ...change },
        "sb_publishable_fixture",
      ),
      false,
    );
});
test("removes model, implicit OIDC and payment credentials; preserves isolated database access", () => {
  const env = {
    VERCEL_ENV: "preview",
    SUPABASE_URL: TEST_BACKEND,
    SUPABASE_SERVICE_ROLE_KEY: "TEST-only",
    STRIPE_SECRET_KEY: "never-use",
    OLLAMA_API_KEY: "never-use",
    VERCEL_OIDC_TOKEN: "never-use",
  };
  assert.equal(prepareManagerTestEnvironment(env, "sb_publishable_fixture"), true);
  assert.equal(env.SUPABASE_SERVICE_ROLE_KEY, "TEST-only");
  assert.equal(env.STRIPE_SECRET_KEY, undefined);
  assert.equal(env.OLLAMA_API_KEY, undefined);
  assert.equal(env.VERCEL_OIDC_TOKEN, undefined);
  assert.equal(env.NONA_OLLAMA_TEST_ENABLE, "closed-manager-validation");
});
test("blocks order, billing and webhook requests while keeping authenticated manager routes available", async () => {
  let calls = 0;
  const handler = managerTestBoundary(() => {
    calls++;
    return new Response("TEST");
  }, true);
  for (const [method, url] of [
    ["POST", "/api/public/guest-order"],
    ["POST", "/api/billing"],
    ["GET", "/api/stripe/status"],
    ["POST", "/api/webhooks/stripe"],
  ]) {
    const res = await handler.fetch(new Request("https://test.invalid" + url, { method }));
    assert.equal(res.status, 405);
  }
  assert.equal(calls, 0);
  await handler.fetch(new Request("https://test.invalid/app"));
  await handler.fetch(
    new Request("https://test.invalid/_serverFn/authenticated-manager", { method: "POST" }),
  );
  assert.equal(calls, 2);
});
