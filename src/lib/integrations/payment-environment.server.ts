import { getRequest } from "@tanstack/react-start/server";

const PAYMENT_ENV_KEYS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_LIVE_VERIFIED",
  "STRIPE_PRICE_BASE",
  "STRIPE_PRICE_EXTRA",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_CONNECT_WEBHOOK_SECRET",
  "HOSTBUDDY_APP_URL",
] as const;

type RuntimeRequest = Request & {
  runtime?: { name?: string; cloudflare?: { env?: unknown } };
};

/** Read server bindings at request time, never cache or expose secret values. */
export function paymentServerEnvironment(request?: Request): NodeJS.ProcessEnv {
  let current = request as RuntimeRequest | undefined;
  if (!current) {
    try {
      current = getRequest() as RuntimeRequest;
    } catch {
      // Node development, tests and scheduled work can run outside a request.
    }
  }
  const cloudflare = current?.runtime?.cloudflare;
  const source =
    cloudflare || current?.runtime?.name === "cloudflare" ? cloudflare?.env : process.env;
  const env: NodeJS.ProcessEnv = {};
  if (!source || typeof source !== "object") return env;
  for (const key of PAYMENT_ENV_KEYS) {
    const value = (source as Record<string, unknown>)[key];
    if (typeof value === "string") env[key] = value;
  }
  return env;
}
