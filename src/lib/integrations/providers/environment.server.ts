import { getRequest } from "@tanstack/react-start/server";

type RuntimeRequest = Request & {
  runtime?: { name?: string; cloudflare?: { env?: unknown } };
};

/** Keep the PMS encryption key tied to the current worker, never to a cached client. */
export function providerEncryptionKey(request?: Request): string | undefined {
  let current = request as RuntimeRequest | undefined;
  if (!current) {
    try {
      current = getRequest() as RuntimeRequest;
    } catch {
      // Node tests and development can run outside a request.
    }
  }
  const cloudflare = current?.runtime?.cloudflare;
  const source =
    cloudflare || current?.runtime?.name === "cloudflare" ? cloudflare?.env : process.env;
  if (!source || typeof source !== "object") return undefined;
  const value = (source as Record<string, unknown>)["PMS_ENCRYPTION_KEY"];
  return typeof value === "string" ? value : undefined;
}

export function providerEncryptionConfigured(): boolean {
  const value = providerEncryptionKey();
  return !!value && Buffer.from(value, "base64").length === 32;
}
