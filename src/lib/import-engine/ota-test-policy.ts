export const otaReferenceSources = [
  "https://www.airbnb.fr/rooms/1086157072408105944",
  "https://www.booking.com/hotel/gr/vallais-villa.fr.html",
  "https://www.booking.com/hotel/sc/la-digue-island-lodge.fr.html",
] as const;

/** Expired TEST access is a configuration state, not a platform extraction
 * failure. Never fall through to an unrelated fetcher or imply that text input
 * is required when the experiment simply needs renewing. */
export function otaTestExpired(
  url: string,
  env: Record<string, string | undefined>,
  now = Date.now(),
) {
  const until = Date.parse(env["NONA_OTA_PUBLIC_TEST_UNTIL"] ?? "");
  return (
    env["VERCEL_ENV"] === "preview" &&
    env["VITE_SUPABASE_PROJECT_ID"] === "mhhtnqfdkyudwyqlmnce" &&
    otaReferenceSources.some((source) => source === url) &&
    Number.isFinite(until) &&
    until <= now
  );
}

/** No client-controlled flag. Closed outside this project, after expiry, and for
 * URLs other than the explicit experiment list. Never changes production access. */
export function otaTestAllowed(
  url: string,
  env: Record<string, string | undefined>,
  now = Date.now(),
) {
  const until = Date.parse(env["NONA_OTA_PUBLIC_TEST_UNTIL"] ?? "");
  return (
    env["VERCEL_ENV"] === "preview" &&
    env["VITE_SUPABASE_PROJECT_ID"] === "mhhtnqfdkyudwyqlmnce" &&
    Number.isFinite(until) &&
    now < until &&
    until - now <= 48 * 60 * 60 * 1000 &&
    otaReferenceSources.some((source) => source === url)
  );
}
