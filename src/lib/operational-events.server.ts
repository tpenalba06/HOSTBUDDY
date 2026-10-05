type OperationalEvent =
  | "server_request_failed"
  | "stripe_webhook_unavailable"
  | "stripe_webhook_failed"
  | "stripe_webhook_mode_mismatch"
  | "billing_sync_failed"
  | "billing_sync_pending";

/** Fixed fields only: never include requests, URLs, tokens, bodies or exception text. */
export function reportOperationalEvent(event: OperationalEvent, pending?: number) {
  console.error({
    schema: "hostbuddy.operations.v1",
    event,
    level: "error",
    at: new Date().toISOString(),
    ...(Number.isSafeInteger(pending) && pending! >= 0 ? { pending } : {}),
  });
}
