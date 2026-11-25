import { lodgingPhotoCandidates } from "./photo-candidates";
import { lodgingDom, type LodgingRecord } from "./lodging-dom";
import { safePublicFetch } from "./safe-public-fetch";
import { robotsTextAllows } from "./robots-policy";
import { analyzeImportDocument } from "./intelligence.server";
import { htmlDocumentText, sunverGuestDocument } from "./html-document";
import type { ExtractedField, ImportSource, UrlImportOutcome } from "./types";
import { reportOperationalEvent } from "@/lib/operational-events.server";
import { otaListing, otaPlatformHost } from "./ota-listing";
import { otaImportAccess } from "./ota-access.server";
import { accessChallenge } from "./html-snapshot";
import { authorizedEvaluationSource } from "./authorized-source";

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

export async function robotsAllows(url: URL, agent?: string): Promise<boolean> {
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
    return robotsTextAllows(new TextDecoder().decode(fetched.buffer), url, agent);
  } catch {
    return false;
  }
}

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null;

export function extractStructuredFields(html: string, url: string, page = lodgingDom(html)) {
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
  const lodging = page.lodging.length > 0;
  let locality: string | null = null;
  for (const n of page.lodging) {
    name ??= str(n["name"]);
    put("description", str(n["description"]), `Property structured description (${url})`, 0.85);
    const a = n["address"] as LodgingRecord | string | undefined;
    locality ??= typeof a === "object" && a ? str(a["addressLocality"]) : null;
    const addr =
      typeof a === "string"
        ? a
        : a
          ? [a["streetAddress"], a["postalCode"], a["addressLocality"], a["addressCountry"]]
              .map(str)
              .filter(Boolean)
              .join(", ")
          : null;
    put("address", addr || null, `JSON-LD address: ${addr}`, 0.85);
    const occupancy = n["occupancy"];
    const occ =
      str(
        occupancy && typeof occupancy === "object"
          ? (occupancy as LodgingRecord)["maxValue"]
          : occupancy,
      ) ?? str(n["maximumAttendeeCapacity"]);
    const rooms = str(n["numberOfRooms"] ?? n["numberOfBedrooms"]);
    const cap = [occ && `${occ} voyageurs`, rooms && `${rooms} chambres`]
      .filter(Boolean)
      .join(" · ");
    put("capacity", cap || null, `JSON-LD: ${cap}`, 0.85);
    const am = Array.isArray(n["amenityFeature"])
      ? (n["amenityFeature"] as (LodgingRecord | null)[])
          .filter(
            (x): x is LodgingRecord =>
              !!x && typeof x === "object" && x["value"] !== false && x["value"] !== "false",
          )
          .map((x) => str(x["name"]))
          .filter(Boolean)
          .join(", ")
      : null;
    put("equipment", am || null, `JSON-LD amenityFeature: ${am}`, 0.8);
    put("arrival", str(n["checkinTime"]), `JSON-LD checkinTime: ${str(n["checkinTime"])}`, 0.85);
    put(
      "departure",
      str(n["checkoutTime"]),
      `JSON-LD checkoutTime: ${str(n["checkoutTime"])}`,
      0.85,
    );
    put("contact", str(n["telephone"]) ?? str(n["email"]), `JSON-LD telephone/email`, 0.75);
  }
  name ??= page.metadata.get("og:title") ?? (page.title || null);
  const desc = page.metadata.get("og:description") ?? page.metadata.get("description");
  // Without a lodging JSON-LD node the meta description stays "to verify".
  if (desc) put("description", desc, `meta description: ${desc}`, lodging ? 0.75 : 0.5);
  return { name, fields, lodging, locality };
}

/** Rules only run on sentence-sized web snippets; keyword hits inside long link lists or menus are noise. */
export function webTextForRules(text: string) {
  return text
    .split("\n")
    .filter((line) => line.trim().length <= 300)
    .join("\n");
}

export async function extractAccessibleHtml(
  html: string,
  resolvedUrl: string,
  localAi = false,
  page = lodgingDom(html),
) {
  const structured = extractStructuredFields(html, resolvedUrl, page);
  const sunver = sunverGuestDocument(html, resolvedUrl);
  const ota = otaListing(resolvedUrl);
  const visible = sunver?.text ?? htmlDocumentText(page.document);
  // Calendar controls repeat the same labels without publishing any check-in/out facts.
  const document = ota
    ? visible
        .split("\n")
        .filter(
          (line) =>
            !/^(?:#\s*)?(?:arrivée|départ|check[ -]in|check[ -]out|llegada|salida|anreise|abreise|arrivo|partenza|chegada|saída|ajouter une date|add date|vérifier la disponibilité|check availability|sélectionnez la date d'arrivée|select check-in date)\s*$/iu.test(
              line.trim(),
            ) && !/^#\s*(?:évaluation par étoiles|star rating)\s*:/iu.test(line),
        )
        .join("\n")
    : visible;
  const textual = await analyzeImportDocument(document, {
    sourceUrl: resolvedUrl,
    localAi,
  });
  const fields = textual.fields.map((field) => {
    if (field.key === "description" && sunver?.description)
      return {
        ...field,
        value: sunver.description,
        rawValue: sunver.description,
        status: "to_verify" as const,
        evidence: [
          {
            method: "structured" as const,
            sourceUrl: resolvedUrl,
            quote: "Sunver public property introduction",
          },
        ],
      };
    if (field.key === "recommendations" && sunver?.recommendations)
      return {
        ...field,
        value: sunver.recommendations,
        rawValue: sunver.recommendations,
        status: "to_verify" as const,
        confidence: 0.85,
        evidence: [
          { quote: sunver.recommendations, sourceUrl: resolvedUrl, method: "structured" as const },
        ],
      };
    const metadata = sunver ? undefined : structured.fields[field.key];
    if (!metadata) return field;
    return {
      ...metadata,
      status: "to_verify" as const,
      rawValue: [metadata.rawValue, field.rawValue].filter(Boolean).join("\n"),
      evidence: [
        ...(field.evidence ?? []),
        {
          quote: metadata.rawValue ?? metadata.value!,
          sourceUrl: resolvedUrl,
          method: "structured" as const,
        },
      ],
      // Preserve competing sources in the review, rather than silently replacing one.
      ...(!(
        ota &&
        field.key === "description" &&
        metadata.rawValue?.startsWith("Property structured description")
      ) &&
      field.value &&
      metadata.value &&
      !field.value.includes(metadata.value) &&
      !metadata.value.includes(field.value)
        ? {
            value: [metadata.value, field.value].join("\n"),
            issues: ["conflicting_sources" as const],
          }
        : {}),
    };
  });
  const photoCandidates = lodgingPhotoCandidates(page, resolvedUrl);
  return {
    ...textual,
    ...(sunver?.locality || structured.locality
      ? { publicLocality: (sunver?.locality || structured.locality)! }
      : {}),
    ...(sunver?.placeNames.length ? { publicPlaceNames: sunver.placeNames } : {}),
    propertyName: sunver
      ? textual.propertyName
      : (structured.name?.slice(0, 120) ?? textual.propertyName),
    fields,
    photos: [
      ...new Set([...(sunver?.photos ?? []), ...photoCandidates.map((photo) => photo.url)]),
    ].slice(0, 30),
    photoRightsConfirmed: false,
    photoCandidates,
  };
}

export async function fetchAccessibleListingHtml(url: URL) {
  const access = otaImportAccess(url.href);
  const direct = access?.mode === "direct" ? access.listing : null;
  if (otaPlatformHost(url.hostname) && !direct) return { reason: "blocked" } as const;
  if (direct) url = new URL(direct.url);
  if (url.hostname === "app.sunver.app" && !/^\/[a-z]{2}\/guest\//.test(url.pathname))
    return { reason: "blocked" } as const;
  const permitted = (target: URL) =>
    (direct ? target.href !== direct.url : otaPlatformHost(target.hostname))
      ? Promise.resolve(false)
      : robotsAllows(target);
  if (!(await permitted(url))) return { reason: "blocked" } as const;

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
      permitted,
    );
    const res = fetched.response;
    if ([401, 402, 403, 407, 429, 451, 503].includes(res.status))
      return { reason: "blocked" } as const;
    const mime = res.headers.get("content-type")?.split(";")[0];
    if (
      !res.ok ||
      (mime !== "text/html" && !(mime === "text/plain" && authorizedEvaluationSource(fetched.url)))
    )
      return { reason: "unreachable" } as const;
    html = new TextDecoder().decode(fetched.buffer);
    resolvedUrl = fetched.url;
  } catch (e) {
    reportOperationalEvent("import_source_unavailable");
    return {
      reason: e instanceof Error && e.message === "blocked" ? "blocked" : "unreachable",
    } as const;
  }
  if (
    accessChallenge.test(html.slice(0, 20_000)) ||
    /cf-challenge|aws-waf/i.test(html.slice(0, 20_000))
  ) {
    return { reason: "blocked" } as const;
  }
  return { html, resolvedUrl } as const;
}

export async function runUrlImport(data: {
  url: string;
  source: ImportSource;
  localAi?: boolean;
}): Promise<UrlImportOutcome> {
  let source = data.source;
  let url: URL;
  try {
    url = new URL(data.url);
  } catch {
    return { ok: false, source, reason: "invalid" };
  }
  if (!/^https?:$/.test(url.protocol) || isPrivateHost(url.hostname))
    return { ok: false, source, reason: "invalid" };
  const access = otaImportAccess(url.href);
  if (!access && otaPlatformHost(url.hostname)) return { ok: false, source, reason: "invalid" };
  if (access?.mode === "authorization_required")
    return { ok: false, source: access.listing.platform, reason: "authorization_required" };
  if (access?.mode === "direct") {
    source = access.listing.platform;
    url = new URL(access.listing.url);
  }
  const fetched = await fetchAccessibleListingHtml(url);
  if ("reason" in fetched) return { ok: false, source, reason: fetched.reason };
  const { html, resolvedUrl } = fetched;

  let result;
  let page;
  try {
    page = lodgingDom(html);
    result = await extractAccessibleHtml(html, resolvedUrl, data.localAi ?? false, page);
  } catch {
    return { ok: false, source, reason: "insufficient" };
  }
  const structured = extractStructuredFields(html, resolvedUrl, page);
  // A generic meta description is not evidence that the page describes a property.
  const useful = result.fields.filter(
    (f) => f.status !== "missing" && !(f.key === "description" && !structured.lodging),
  ).length;
  // A recognized listing with a title is enough to prepare a partial draft.
  // Never lower the threshold for a generic page with only site metadata.
  const identifiedListing = structured.lodging || !!sunverGuestDocument(html, resolvedUrl);
  if (useful < 2 && !(identifiedListing && result.propertyName?.trim()))
    return { ok: false, source, reason: "insufficient" };
  return {
    ok: true,
    source,
    result,
  };
}
