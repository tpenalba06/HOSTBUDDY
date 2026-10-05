import { timingSafeEqual } from "node:crypto";
import { paymentServerEnvironment } from "./payment-environment.server";

/** Authenticate before loading any admin client or touching billing jobs. */
export async function handleBillingSyncRequest(
  request: Request,
  sync: () => Promise<{ pending: number }>,
): Promise<Response> {
  const secret = paymentServerEnvironment(request)["BILLING_SYNC_SECRET"];
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const headers = { "Cache-Control": "no-store" };
  if (
    !secret ||
    Buffer.byteLength(token) !== Buffer.byteLength(secret) ||
    !timingSafeEqual(Buffer.from(token), Buffer.from(secret))
  )
    return new Response(null, { status: 401, headers });
  try {
    const result = await sync();
    return Response.json(result, {
      status: result.pending ? 503 : 200,
      headers: result.pending ? { ...headers, "Retry-After": "60" } : headers,
    });
  } catch {
    return Response.json(
      { error: "billing_sync_unavailable" },
      { status: 503, headers: { ...headers, "Retry-After": "60" } },
    );
  }
}
