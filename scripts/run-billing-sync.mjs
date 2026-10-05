import { pathToFileURL } from "node:url";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

/** Preview-only runner. Never follow redirects with a bearer secret. */
export async function runBillingSync({ endpoint, secret, send = fetch, wait = delay }) {
  const url = new URL(endpoint);
  if (
    url.protocol !== "https:" ||
    !/^(?:(?:id-)?preview--[a-z0-9-]+|project--[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-dev)\.lovable\.app$/.test(
      url.hostname,
    ) ||
    url.pathname !== "/api/public/billing-sync" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    url.port ||
    !secret ||
    secret.length < 32
  )
    throw new Error("billing_sync_test_configuration_invalid");
  for (let attempt = 0; attempt < 4; attempt++) {
    let response;
    try {
      response = await send(url.href, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
        redirect: "error",
        signal: AbortSignal.timeout(25_000),
      });
    } catch {
      // Network errors and temporary server failures are retried without logging secrets.
    }
    if (response?.ok) return;
    if (response && response.status < 500) throw new Error("billing_sync_test_request_rejected");
    if (attempt < 3) await wait([1000, 3000, 7000][attempt]);
  }
  throw new Error("billing_sync_test_retry_exhausted");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runBillingSync({
    endpoint: process.env.HOSTBUDDY_BILLING_SYNC_URL,
    secret: process.env.BILLING_SYNC_SECRET,
  }).then(
    () => console.log("billing_sync_test_completed"),
    () => {
      console.error("billing_sync_test_failed: check configuration and server logs");
      process.exitCode = 1;
    },
  );
}
