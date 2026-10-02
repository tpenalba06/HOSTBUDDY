// One adapter per source. Today they all use the permitted generic public
// fetch; official APIs/OAuth can replace any `run` without touching the UI.
import { importFromUrl } from "./url-import.functions";
import type { ImportSource, UrlSourceAdapter } from "./types";

const generic = (source: ImportSource, matches: (h: string) => boolean): UrlSourceAdapter => ({
  source,
  matches,
  run: (url) => importFromUrl({ data: { url, source } }),
});

export const airbnbAdapter = generic("airbnb", (h) => /(^|\.)airbnb\./.test(h));
export const bookingAdapter = generic("booking", (h) => /(^|\.)booking\.com$/.test(h));
export const sunverAdapter = generic("sunver", (h) => /sunver/.test(h));
export const genericWebAdapter = generic("website", () => true);

const ADAPTERS = [airbnbAdapter, bookingAdapter, sunverAdapter, genericWebAdapter];

const AIRBNB_ROOM_PATH = /^\/rooms\/(\d+)(?:\/|$)/i;
const AIRBNB_SEARCH_PATH = /^\/s\/.*\/homes\/?$/i;

function isAirbnbHost(hostname: string) {
  return /(^|\.)airbnb\./i.test(hostname);
}

function cleanInput(input: string) {
  // Some apps copy markdown-escaped query strings ("\&"). Browsers do not need
  // those slashes and URLSearchParams would otherwise fail to see later params.
  return input.trim().replace(/\\&/g, "&");
}

function airbnbPinnedListingIds(url: URL) {
  const values = [
    ...url.searchParams.getAll("pinned_listings[]"),
    ...url.searchParams.getAll("pinned_listings"),
  ];
  return [...new Set(values.filter((value) => /^\d{5,30}$/.test(value)))];
}

export type ImportUrlIssue = "airbnb_search_without_single_listing";

export function getImportUrlIssue(input: string): ImportUrlIssue | null {
  const value = cleanInput(input);
  if (!value) return null;

  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (!isAirbnbHost(url.hostname) || !AIRBNB_SEARCH_PATH.test(url.pathname)) return null;
    return airbnbPinnedListingIds(url).length === 1
      ? null
      : "airbnb_search_without_single_listing";
  } catch {
    return null;
  }
}

export function pickAdapter(url: string): UrlSourceAdapter {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    /* invalid */
  }
  return ADAPTERS.find((a) => a.matches(host)) ?? genericWebAdapter;
}

export function normalizeUrl(input: string): string | null {
  const value = cleanInput(input);
  if (!value) return null;

  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    const host = url.hostname.toLowerCase();

    if (isAirbnbHost(host)) {
      const directRoom = url.pathname.match(AIRBNB_ROOM_PATH)?.[1];
      if (directRoom) {
        // Tracking/search params do not belong to the source of truth.
        return new URL(`/rooms/${directRoom}`, url.origin).toString();
      }

      if (AIRBNB_SEARCH_PATH.test(url.pathname)) {
        const pinned = airbnbPinnedListingIds(url);
        if (pinned.length === 1) {
          // Airbnb homepage/search carousels often link to /s/.../homes and put
          // the selected accommodation only in pinned_listings[]. Convert it to
          // the actual room URL before fetching; never parse the whole search page.
          return new URL(`/rooms/${pinned[0]}`, url.origin).toString();
        }
      }
    }

    return url.toString();
  } catch {
    return null;
  }
}
