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
  const v = input.trim();
  if (!v) return null;
  try {
    return new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`).toString();
  } catch {
    return null;
  }
}
