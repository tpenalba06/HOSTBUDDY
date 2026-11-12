// Prepared commercial fallback only. Never activated by this module itself.
import { pathToFileURL } from "node:url";

export async function runCommercialBillingSync(env, send = fetch) {
  const origin = "https://host-buddy-concierge.lovable.app";
  if (
    env.NONA_COMMERCIAL_OPS_APPROVED !== "true" ||
    env.STRIPE_LIVE_VERIFIED !== "true" ||
    env.HOSTBUDDY_APP_URL !== origin ||
    typeof env.BILLING_SYNC_SECRET !== "string" ||
    env.BILLING_SYNC_SECRET.length < 32 ||
    /[\r\n]/.test(env.BILLING_SYNC_SECRET)
  )
    throw new Error("commercial_sync_not_authorized");
  const response = await send(origin + "/api/public/billing-sync", {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
    headers: { Authorization: "Bearer " + env.BILLING_SYNC_SECRET },
  });
  // No TEST mode header and no secret, body or provider error in output.
  if (response.status !== 200) throw new Error("commercial_sync_unavailable");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("commercial_sync_invalid_response");
  const decoder = new TextDecoder();
  let body = "";
  let bytes = 0;
  try {
    for (;;) {
      const item = await reader.read();
      if (item.done) break;
      bytes += item.value.byteLength;
      if (bytes > 4096) throw new Error("commercial_sync_invalid_response");
      body += decoder.decode(item.value, { stream: true });
    }
    body += decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
  }
  const value = JSON.parse(body);
  if (value?.pending !== 0) throw new Error("commercial_sync_pending");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCommercialBillingSync(process.env).then(
    () => console.log('{"schema":"nona.commercial-sync.v1","status":"PASS"}'),
    () => {
      console.error('{"schema":"nona.commercial-sync.v1","status":"BLOCKED_OR_FAILED"}');
      process.exitCode = 1;
    },
  );
}
