import { test } from "node:test";
import assert from "node:assert/strict";
import { runCommercialBillingSync } from "./run-commercial-billing-sync.mjs";

test("new scheduler preparation cannot call anything without explicit commercial/Live approval", async () => {
  let calls = 0;
  const env = {
    NONA_COMMERCIAL_OPS_APPROVED: "true",
    STRIPE_LIVE_VERIFIED: "true",
    HOSTBUDDY_APP_URL: "https://host-buddy-concierge.lovable.app",
    BILLING_SYNC_SECRET: "fixed-test-fixture-01234567890123456789",
  };
  const send = async (url, options) => {
    calls++;
    assert.equal(url, env.HOSTBUDDY_APP_URL + "/api/public/billing-sync");
    assert.equal(options.redirect, "error");
    assert.equal(options.headers["X-HostBuddy-Billing-Mode"], undefined);
    return Response.json({ pending: 0 });
  };
  for (const value of [
    {},
    { ...env, NONA_COMMERCIAL_OPS_APPROVED: "false" },
    { ...env, STRIPE_LIVE_VERIFIED: "false" },
    { ...env, HOSTBUDDY_APP_URL: "https://id-preview--example.lovable.app" },
  ])
    await assert.rejects(runCommercialBillingSync(value, send), /commercial_sync_not_authorized/);
  assert.equal(calls, 0);
  await runCommercialBillingSync(env, send);
  assert.equal(calls, 1);
  await assert.rejects(
    runCommercialBillingSync(env, async () => Response.json({ pending: 1 })),
    /commercial_sync_pending/,
  );
  await assert.rejects(
    runCommercialBillingSync(env, async () => new Response("rejected", { status: 401 })),
    /commercial_sync_unavailable/,
  );
});
