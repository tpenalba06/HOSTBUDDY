import { createHash, createHmac, randomUUID } from "node:crypto";
import type { NormalizedProperty } from "./model";

export const SESSION_PROVIDERS = ["lodgify", "hostaway", "smoobu", "beds24"] as const;
export type SessionProvider = (typeof SESSION_PROVIDERS)[number];
export type SessionCredentials = { key: string; secret?: string | undefined };
const origins: Record<SessionProvider, string> = {
  lodgify: "https://api.lodgify.com",
  hostaway: "https://api.hostaway.com",
  smoobu: "https://login.smoobu.com",
  beds24: "https://beds24.com",
};
const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const text = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;
const array = (v: unknown): unknown[] => (Array.isArray(v) ? v.slice(0, 100) : []);

/** Keys never enter URLs, logs, storage or the normalized draft. Only allowlisted GETs. */
export async function readPms(
  provider: SessionProvider,
  credentials: SessionCredentials,
  page = 1,
  externalId?: string,
  fetcher: typeof fetch = fetch,
) {
  if (
    !SESSION_PROVIDERS.includes(provider) ||
    !credentials.key.trim() ||
    page < 1 ||
    page > 100 ||
    !Number.isInteger(page) ||
    (externalId && !/^[\w-]{1,120}$/.test(externalId))
  )
    throw new Error("provider_invalid_request");
  const id = externalId ? encodeURIComponent(externalId) : null;
  const path =
    provider === "lodgify"
      ? `/v2/properties${id ? `/${id}` : `?page=${page}&size=50`}`
      : provider === "hostaway"
        ? `/v1/listings${id ? `/${id}?includeResources=1` : `?limit=100&offset=${(page - 1) * 100}&includeResources=1`}`
        : provider === "smoobu"
          ? `/api/apartments${id ? `/${id}` : ""}`
          : `/api/v2/properties?${id ? `id=${id}&` : ""}page=${page}&includeAllRooms=true`;
  const headers: Record<string, string> = { accept: "application/json" };
  if (provider === "lodgify") headers["X-ApiKey"] = credentials.key;
  if (provider === "hostaway") headers["authorization"] = `Bearer ${credentials.key}`;
  if (provider === "beds24") headers["token"] = credentials.key;
  if (provider === "smoobu") {
    if (!credentials.secret) throw new Error("provider_credentials_invalid");
    const timestamp = new Date().toISOString();
    const nonce = randomUUID();
    const url = new URL(path, origins[provider]);
    const canonical = [
      "GET",
      url.pathname,
      url.searchParams.toString(),
      timestamp,
      nonce,
      createHash("sha256").update("").digest("hex"),
      credentials.key,
    ].join("\n");
    headers["X-API-Key"] = credentials.key;
    headers["X-Timestamp"] = timestamp;
    headers["X-Nonce"] = nonce;
    headers["X-Signature"] = createHmac("sha256", credentials.secret)
      .update(canonical)
      .digest("base64");
  }
  const response = await fetcher(origins[provider] + path, {
    headers,
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "provider_rate_limited"
        : [401, 403].includes(response.status)
          ? "provider_credentials_invalid"
          : "provider_unavailable",
    );
  if (!response.headers.get("content-type")?.includes("json") || !response.body)
    throw new Error("provider_invalid_response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 4_000_000) throw new Error("provider_response_too_large");
      chunks.push(part.value);
    }
  } finally {
    await reader.cancel();
  }
  const payload: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  const body = record(payload);
  if (body["success"] === false || body["status"] === "fail")
    throw new Error("provider_invalid_response");
  const rows =
    externalId && provider !== "beds24"
      ? [provider === "hostaway" ? body["result"] : payload]
      : array(
          provider === "lodgify"
            ? body["items"]
            : provider === "hostaway"
              ? body["result"]
              : provider === "smoobu"
                ? body["apartments"]
                : body["data"],
        );
  if (
    !externalId &&
    !Array.isArray(
      provider === "lodgify"
        ? body["items"]
        : provider === "hostaway"
          ? body["result"]
          : provider === "smoobu"
            ? body["apartments"]
            : body["data"],
    )
  )
    throw new Error("provider_invalid_response");
  const properties = rows.map((row) => normalizePms(provider, row, externalId));
  const nextPage =
    externalId || provider === "smoobu"
      ? null
      : provider === "beds24"
        ? record(body["pages"])["nextPageExists"] === true
          ? page + 1
          : null
        : properties.length === (provider === "hostaway" ? 100 : 50)
          ? page + 1
          : null;
  return { properties, nextPage };
}

export function normalizePms(
  provider: SessionProvider,
  value: unknown,
  expectedId?: string,
): NormalizedProperty {
  const row = record(value);
  const externalId = String(row["id"] ?? expectedId ?? "");
  if (!/^[\w-]{1,120}$/.test(externalId) || (expectedId && externalId !== expectedId))
    throw new Error("provider_invalid_response");
  const location = provider === "smoobu" ? record(row["location"]) : row;
  const fields: NormalizedProperty["fields"] = [];
  const put = (key: string, v: unknown) => {
    const content = text(v);
    if (content)
      fields.push({
        key,
        value: content.slice(0, 50_000),
        rawValue: content.slice(0, 50_000),
        status: "to_verify",
        confidence: 0.9,
      });
  };
  put("description", row["description"]);
  put(
    "address",
    [
      text(location["street"] ?? location["address"]),
      text(location["zip"] ?? location["zipCode"] ?? location["postcode"]),
      text(location["city"]),
      text(location["country"] ?? location["countryName"]),
    ]
      .filter(Boolean)
      .join(", "),
  );
  if (provider === "hostaway") {
    put("arrival", row["checkInTimeStart"]);
    put("departure", row["checkOutTime"]);
    put("rules", row["houseRules"]);
  }
  const pictures = array(provider === "hostaway" ? row["listingImages"] : row["images"]);
  const photos = [
    ...new Set(
      pictures.flatMap((p) => {
        const candidate = text(typeof p === "string" ? p : record(p)["url"]);
        if (!candidate) return [];
        try {
          const u = new URL(candidate);
          return u.protocol === "https:" && !u.username && !u.password ? [u.href] : [];
        } catch {
          return [];
        }
      }),
    ),
  ].slice(0, 30);
  return {
    provider,
    externalId,
    name: text(row["name"]) ?? null,
    importedAt: new Date().toISOString(),
    fields,
    photos,
  };
}
