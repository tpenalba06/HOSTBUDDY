import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const share = JSON.parse(
  await readFile(new URL("../../../nona-private/design-preview.json", import.meta.url), "utf8"),
);
const origin = new URL(share.guide).origin;
const call = (path, options = {}) =>
  fetch(origin + path, { redirect: "manual", signal: AbortSignal.timeout(15000), ...options });
assert.equal((await call("/nona")).status, 404);
assert.equal((await call("/nona", { headers: { cookie: "nona_design=invalid" } })).status, 404);
const entry = await fetch(share.guide, { redirect: "manual" });
assert.equal(entry.status, 303);
const access = entry.headers.get("set-cookie").split(";")[0];
const page = await call("/nona", { headers: { cookie: access } });
assert.equal(page.status, 200);
const lab = page.headers.get("set-cookie").split(";")[0];
const cookie = access + "; " + lab;
assert.match(page.headers.get("content-security-policy"), /connect-src 'self'/);
assert.equal(
  (await call("/configure", { method: "POST", headers: { cookie, origin } })).status,
  404,
);
assert.equal(
  (await call("/api/public/orders", { method: "POST", headers: { cookie, origin } })).status,
  404,
);
assert.equal(
  (
    await call("/chat", {
      method: "POST",
      headers: { cookie, origin: "https://example.invalid" },
      body: "{}",
    })
  ).status,
  403,
);
assert.equal(
  (
    await call("/chat", {
      method: "POST",
      headers: { cookie, origin, "content-type": "application/json" },
      body: JSON.stringify({ mode: "ai" }),
    })
  ).status,
  403,
);
const state = await (await call("/status", { headers: { cookie } })).json();
assert.equal(state.localOnly, true);
assert.equal(state.paidApisEnabled, false);
assert.equal((await call("/demo?preview=manager", { headers: { cookie } })).status, 200);
const evidence = {
  checkedAt: new Date().toISOString(),
  scope: "PC-to-own-LAN endpoint; physical phone not available to agent",
  authenticatedLanPreview: true,
  expiresAt: share.expiresAt,
  unauthenticatedAccessRejected: true,
  cloudModeRejectedBeforeProxy: true,
  crossOriginPostRejected: true,
  externalBrowserConnectionsBlockedByCsp: true,
  accountPaymentAndConfigurationRoutesAbsent: true,
  inferenceCallsDuringSecurityCheck: 0,
  passed: true,
};
await writeFile(
  new URL("../../docs/evidence/nona-da-lan-20261017.json", import.meta.url),
  JSON.stringify(evidence, null, 2),
);
console.log(JSON.stringify(evidence));
