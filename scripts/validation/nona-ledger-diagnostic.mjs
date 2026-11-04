import { createClient } from "@supabase/supabase-js";

export function keyKind(key) {
  if (typeof key !== "string") return "missing";
  if (key.startsWith("sb_secret_")) return "server-secret";
  if (key.startsWith("sb_publishable_")) return "public";
  try {
    // Classification only; Supabase must still authenticate the actual key.
    const claim = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString());
    return claim.role === "service_role" ? "legacy-server" : "public-or-user";
  } catch {
    return "unknown";
  }
}

export function ledgerFailure(error, status) {
  // Never return upstream messages, headers, URLs or credentials.
  const code = ["42501", "42P01", "PGRST205", "PGRST116"].includes(error?.code)
    ? error.code
    : "unknown";
  let reason = "unavailable";
  if (code === "42501") reason = "permission-denied";
  else if (code === "42P01" || code === "PGRST205") reason = "table-or-schema-cache-missing";
  else if (code === "PGRST116") reason = "authorization-row-missing-or-invisible";
  else if (status === 401 || status === 403) reason = "key-refused";
  return { ok: false, reason, code, httpStatus: Number.isInteger(status) ? status : null };
}

export async function inspectLedger(config) {
  const kind = keyKind(config?.supabase);
  if (kind === "public" || kind === "public-or-user")
    return { ok: false, reason: "server-key-required", keyKind: kind };
  if (kind === "missing" || kind === "unknown")
    return { ok: false, reason: "invalid-key-format", keyKind: kind };
  try {
    const db = createClient("https://mhhtnqfdkyudwyqlmnce.supabase.co", config.supabase, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(5000) }) },
    });
    const { data, error, status } = await db
      .from("nona_ai_authorization")
      .select("enabled,expires_at,cap_micros,reserved_micros")
      .eq("id", "concierge-test-20261015")
      .single();
    if (error) return { ...ledgerFailure(error, status), keyKind: kind };
    return { ok: true, keyKind: kind, authorization: data };
  } catch {
    return { ok: false, reason: "network-or-timeout", keyKind: kind };
  }
}
