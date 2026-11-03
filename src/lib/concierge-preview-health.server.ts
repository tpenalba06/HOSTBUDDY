import { isNonaPrivatePreviewHost } from "./concierge-preview";

/** Read-only runtime diagnostic. Never reads keys, accesses the ledger or generates. */
export async function conciergePreviewHealth(request: Request) {
  const url = new URL(request.url);
  const headers = { "cache-control": "no-store" };
  if (
    request.method !== "GET" ||
    url.protocol !== "https:" ||
    !isNonaPrivatePreviewHost(url.hostname) ||
    process.env["VERCEL_ENV"] === "production" ||
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (request.headers.has("origin") && request.headers.get("origin") !== url.origin)
  )
    return new Response(null, { status: 403, headers });
  let status: number | null = null;
  let reason = "unavailable";
  let compatible = false;
  try {
    const response = await fetch("https://ollama.com/api/tags", {
      redirect: "error",
      signal: AbortSignal.timeout(4000),
    });
    status = response.status;
    if (response.ok && response.body) {
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 262144) throw new Error("catalogue-too-large");
          chunks.push(value);
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
        compatible = Boolean(
          data &&
          typeof data === "object" &&
          "models" in data &&
          Array.isArray(data.models) &&
          data.models.some(
            (model: unknown) =>
              model &&
              typeof model === "object" &&
              "name" in model &&
              model.name === "gemma4:31b" &&
              "capabilities" in model &&
              Array.isArray(model.capabilities) &&
              model.capabilities.includes("completion") &&
              model.capabilities.includes("tools"),
          ),
        );
        reason = compatible ? "catalogue-ready" : "catalogue-incompatible";
      } finally {
        await reader.cancel().catch(() => {});
      }
    } else {
      reason = "catalogue-http-rejected";
      await response.body?.cancel().catch(() => {});
    }
  } catch (error) {
    const name = error instanceof Error ? error.name : "unknown";
    const message = error instanceof Error ? error.message : "";
    reason = ["TypeError", "ReferenceError", "SyntaxError", "TimeoutError", "AbortError"].includes(
      name,
    )
      ? `catalogue-${name}`
      : "catalogue-unavailable";
    // Static categories only: never return upstream error text or destinations.
    if (/redirect/i.test(message)) reason = "catalogue-redirect-option-rejected";
    else if (/cache/i.test(message)) reason = "catalogue-cache-option-rejected";
    else if (/AbortSignal|timeout.*function/i.test(message))
      reason = "catalogue-timeout-api-unavailable";
    else if (/fetch failed|network|connection/i.test(message)) reason = "catalogue-network-failed";
  }
  return Response.json(
    { modelCalls: 0, ledgerMutations: 0, catalogue: { status, compatible, reason } },
    { headers },
  );
}
