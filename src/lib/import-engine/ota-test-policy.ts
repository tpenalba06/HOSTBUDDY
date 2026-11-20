export const otaReferenceSources = [
  "https://www.airbnb.fr/rooms/1086157072408105944",
  "https://www.booking.com/hotel/gr/vallais-villa.fr.html",
] as const;

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
