import { propertyPhotoCandidates } from "./photo-candidates";
import { safePublicFetch } from "./safe-public-fetch";
import { robotsTextAllows } from "./robots-policy";
import { extractFromText } from "./rules-extractor";
import type { ExtractedField, ImportSource, UrlImportOutcome } from "./types";

export const UA = "HostBuddyBot/1.0 (+import a la demande du proprietaire)";

function isPrivateHost(host: string) {
  return (
    /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?$)/i.test(
      host,
    ) ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  );
}

export async function robotsAllows(url: URL): Promise<boolean> {
  try {
    const fetched = await safePublicFetch(
      `${url.origin}/robots.txt`,
      {
        headers: { "user-agent": UA },
        signal: AbortSignal.timeout(5000),
      },
      256_000,
    );
    const r = fetched.response;
    if (r.status === 404) return true;
    if (!r.ok || r.headers.get("content-type")?.includes("text/html")) return false;
    return robotsTextAllows(new TextDecoder().decode(fetched.buffer), url);
  } catch {
    return false;
  }
}

const meta = (html: string, name: string) =>
  html.match(
    new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`, "i"),
  )?.[1] ??
  html.match(
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, "i"),
  )?.[1] ??
  null;

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function jsonLdNodes(html: string): any[] {
  const out: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1]!);
      const stack = Array.isArray(data) ? data : [data];
      for (const n of stack) {
        if (n && typeof n === "object") {
          out.push(n);
          if (Array.isArray(n["@graph"])) out.push(...n["@graph"]);
        }
      }
    } catch {
      /* ignore broken blocks */
    }
  }
  return out;
}

const LODGING =
  /(Lodging|VacationRental|Accommodation|House|Apartment|Hotel|Residence|SingleFamilyResidence|Product|Place)/i;
const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? decode(v) : typeof v === "number" ? String(v) : null;

export function extractStructuredFields(html: string, url: string) {
  const fields: Record<string, ExtractedField> = {};
  const put = (key: string, value: string | null, raw: string, confidence: number) => {
    if (value && !fields[key])
      fields[key] = {
        key,
        value,
        rawValue: raw,
        confidence,
        status: confidence >= 0.7 ? "found" : "to_verify",
      };
  };
  let name: string | null = null;
  let lodging = false;
  for (const n of jsonLdNodes(html)) {
    if (!LODGING.test(String(n["@type"] ?? ""))) continue;
    lodging = true;
    name ??= str(n.name);
    put("description", str(n.description), `JSON-LD description (${url})`, 0.85);
    const a = n.address;
    const addr =
      typeof a === "string"
        ? a
        : a
          ? [a.streetAddress, a.postalCode, a.addressLocality, a.addressCountry]
              .map(str)
              .filter(Boolean)
              .join(", ")
          : null;
    put("address", addr || null, `JSON-LD address: ${addr}`, 0.85);
    const occ = n.occupancy?.maxValue ?? n.maximumAttendeeCapacity;
    const rooms = n.numberOfRooms ?? n.numberOfBedrooms;
    const cap = [occ && `${str(occ)} voyageurs`, rooms && `${str(rooms)} chambres`]
      .filter(Boolean)
      .join(" · ");
    put("capacity", cap || null, `JSON-LD: ${cap}`, 0.85);
    const am = Array.isArray(n.amenityFeature)
      ? (n.amenityFeature as Record<string, unknown>[])
          .filter((x) => x["value"] !== false && x["value"] !== "false")
          .map((x) => str(x["name"]))
          .filter(Boolean)
          .join(", ")
      : null;
    put("equipment", am || null, `JSON-LD amenityFeature: ${am}`, 0.8);
    put("arrival", str(n.checkinTime), `JSON-LD checkinTime: ${str(n.checkinTime)}`, 0.85);
    put("departure", str(n.checkoutTime), `JSON-LD checkoutTime: ${str(n.checkoutTime)}`, 0.85);
    put("contact", str(n.telephone) ?? str(n.email), `JSON-LD telephone/email`, 0.75);
  }
  const ogTitle = meta(html, "og:title");
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
  name ??= ogTitle ? decode(ogTitle) : title ? decode(title) : null;
  const desc = meta(html, "og:description") ?? meta(html, "description");
  // Without a lodging JSON-LD node the meta description stays "to verify".
  if (desc)
    put("description", decode(desc), `meta description: ${decode(desc)}`, lodging ? 0.75 : 0.5);
  return { name, fields, lodging };
}

/** Rules only run on sentence-sized web snippets; keyword hits inside long link lists or menus are noise. */
export function webTextForRules(text: string) {
  return text
    .split("\n")
    .filter((line) => line.trim().length <= 300)
    .join("\n");
}

function visibleText(html: string) {
  return decode(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(br|\/p|\/div|\/li|\/h\d)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n+/g, "\n"),
  ).slice(0, 20000);
}

export async function runUrlImport(data: {
  url: string;
  source: ImportSource;
}): Promise<UrlImportOutcome> {
  const source = data.source as ImportSource;
  let url: URL;
  try {
    url = new URL(data.url);
  } catch {
    return { ok: false, source, reason: "invalid" };
  }
  if (!/^https?:$/.test(url.protocol) || isPrivateHost(url.hostname))
    return { ok: false, source, reason: "invalid" };
  if (!(await robotsAllows(url))) return { ok: false, source, reason: "blocked" };

  let html: string;
  let resolvedUrl = url.href;
  try {
    const fetched = await safePublicFetch(
      url.toString(),
      {
        headers: { "user-agent": UA, accept: "text/html", "accept-language": "fr-FR,fr;q=0.9" },

        signal: AbortSignal.timeout(12000),
      },
      1_500_000,
      robotsAllows,
    );
    const res = fetched.response;
    if ([401, 402, 403, 407, 429, 451, 503].includes(res.status))
      return { ok: false, source, reason: "blocked" };
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html"))
      return { ok: false, source, reason: "unreachable" };
    html = new TextDecoder().decode(fetched.buffer);
    resolvedUrl = fetched.url;
  } catch (e) {
    console.error("url import fetch failed", e);
    return {
      ok: false,
      source,
      reason: e instanceof Error && e.message === "blocked" ? "blocked" : "unreachable",
    };
  }
  if (
    /(captcha|cf-challenge|are you a robot|access denied|enable javascript to continue)/i.test(
      html.slice(0, 20000),
    )
  ) {
    return { ok: false, source, reason: "blocked" };
  }

  const structured = extractStructuredFields(html, resolvedUrl);
  const textual = extractFromText(webTextForRules(visibleText(html)), 0.6); // page text is never trusted blindly
  const fields = textual.fields.map((f) => structured.fields[f.key] ?? f);
  // A generic meta description is not evidence that the page describes a property.
  const useful = fields.filter(
    (f) => f.status !== "missing" && !(f.key === "description" && !structured.lodging),
  ).length;
  if (useful < 2) return { ok: false, source, reason: "insufficient" };
  return {
    ok: true,
    source,
    result: {
      propertyName: structured.name?.slice(0, 120) ?? null,
      fields,
      photos: propertyPhotoCandidates(html, resolvedUrl),
    },
  };
}
