import { isIP } from "node:net";
import { privateAddress } from "./safe-public-fetch";
import { otaListing, otaPlatformHost } from "./ota-listing";

type Environment = Record<string, string | undefined>;

/** Set only for a platform that has permitted this bounded Firecrawl trial. */
export function otaFirecrawlTrial(input: string, env: Environment = process.env, now = Date.now()) {
  return otaTrial(input, "FIRECRAWL", env, now);
}

export function otaHtmlTrial(input: string, env: Environment = process.env, now = Date.now()) {
  return otaTrial(input, "HTML", env, now);
}

function otaTrial(input: string, mode: "FIRECRAWL" | "HTML", env: Environment, now: number) {
  const listing = otaListing(input);
  if (
    !listing ||
    env["VERCEL_ENV"] !== "preview" ||
    env["VITE_SUPABASE_PROJECT_ID"] !== "mhhtnqfdkyudwyqlmnce"
  )
    return null;
  const until = Date.parse(env[`NONA_${listing.platform.toUpperCase()}_${mode}_TEST_UNTIL`] ?? "");
  return until > now && until - now <= 48 * 60 * 60 * 1000 ? listing : null;
}

/** Provision independently for each platform only after access and reuse are approved. */
export function authorizedOtaSource(input: string, env: Environment = process.env) {
  const listing = otaListing(input);
  if (
    !listing ||
    env["VERCEL_ENV"] !== "preview" ||
    env["VITE_SUPABASE_PROJECT_ID"] !== "mhhtnqfdkyudwyqlmnce"
  )
    return null;
  const prefix = `NONA_${listing.platform.toUpperCase()}_AUTHORIZED`;
  const token = env[`${prefix}_TOKEN`];
  if (!token || /[\r\n]/.test(token)) return null;
  try {
    const endpoint = new URL(env[`${prefix}_ENDPOINT`] ?? "");
    if (
      endpoint.protocol !== "https:" ||
      endpoint.port ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash ||
      !endpoint.hostname.includes(".") ||
      isIP(endpoint.hostname) ||
      privateAddress(endpoint.hostname) ||
      otaPlatformHost(endpoint.hostname)
    )
      return null;
    return { ...listing, endpoint: endpoint.href, token };
  } catch {
    return null;
  }
}
