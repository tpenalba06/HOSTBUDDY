import { isIP } from "node:net";
import { privateAddress } from "./safe-public-fetch";
import { otaListing, otaPlatformHost } from "./ota-listing";

type Environment = Record<string, string | undefined>;

/** Routing policy shared by the anonymous preview and manager importer. */
export function otaImportAccess(input: string) {
  const listing = otaListing(input);
  if (!listing) return null;
  return {
    mode: isOtaTestPreview(process.env) ? "direct" : "authorization_required",
    listing,
  } as const;
}

function isOtaTestPreview(env: Environment) {
  return (
    env["VERCEL_ENV"] === "preview" &&
    env["VITE_SUPABASE_PROJECT_ID"] === "mhhtnqfdkyudwyqlmnce" &&
    (!env["VERCEL_PROJECT_ID"] || env["VERCEL_PROJECT_ID"] === "prj_JNddG5i5NkQyvQI83Blh7X02GVzV")
  );
}

/** Provision independently for each platform only after access and reuse are approved. */
export function authorizedOtaSource(input: string, env: Environment = process.env) {
  const listing = otaListing(input);
  if (!listing || !isOtaTestPreview(env)) return null;
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
