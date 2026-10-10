import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sealCredentials, openCredentials } from "./crypto.server";
import { normalizeGuesty, guestyPage } from "./guesty";
import { providerEncryptionConfigured } from "./environment.server";
import { z } from "zod";
type Connection = {
  organization_id: string;
  provider: string;
  encrypted_credentials: string;
  token_expires_at: string | null;
  refresh_lease_until: string | null;
  last_success_at: string | null;
};
type Db = Database & {
  public: {
    Tables: {
      pms_connections: {
        Row: Connection;
        Insert: Partial<Connection>;
        Update: Partial<Connection>;
        Relationships: [];
      };
    };
    Functions: {
      acquire_provider_token_lease: { Args: { _org: string; _provider: string }; Returns: boolean };
    };
  };
};
const db = supabaseAdmin as unknown as SupabaseClient<Db>;
type Credentials = { clientId: string; clientSecret: string; token?: string };
async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`https://open-api.guesty.com${path}`, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "provider_rate_limited"
        : response.status === 401 || response.status === 403
          ? "provider_credentials_invalid"
          : "provider_unavailable",
    );
  const length = Number(response.headers.get("content-length"));
  if (length > 4_000_000) throw new Error("provider_unavailable");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("provider_unavailable");
  const decoder = new TextDecoder();
  let text = "";
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 4_000_000) throw new Error("provider_unavailable");
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
  }
  return JSON.parse(text) as unknown;
}
export async function saveGuestyCredentials(org: string, clientId: string, clientSecret: string) {
  const encrypted = sealCredentials(org, { clientId, clientSecret });
  const { error } = await db.from("pms_connections").upsert({
    organization_id: org,
    provider: "guesty",
    encrypted_credentials: encrypted,
    token_expires_at: null,
    refresh_lease_until: null,
    last_success_at: null,
  });
  if (error) throw new Error("provider_unavailable");
  await guestyList(org, 0); // No connected claim without a successful authenticated API read.
}
async function token(org: string) {
  const { data: row, error } = await db
    .from("pms_connections")
    .select("*")
    .eq("organization_id", org)
    .eq("provider", "guesty")
    .maybeSingle();
  if (error || !row) throw new Error("provider_not_connected");
  const credentials = openCredentials<Credentials>(org, row.encrypted_credentials);
  if (credentials.token && Date.parse(row.token_expires_at ?? "") > Date.now() + 300_000)
    return credentials.token;
  const { data: lease, error: leaseError } = await db.rpc("acquire_provider_token_lease", {
    _org: org,
    _provider: "guesty",
  });
  if (leaseError || !lease) throw new Error("provider_busy");
  try {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      scope: "open-api",
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    });
    const result = z
      .object({ access_token: z.string().min(1), expires_in: z.number().positive() })
      .parse(
        await request("/oauth2/token", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body,
        }),
      );
    const { error: writeError } = await db
      .from("pms_connections")
      .update({
        encrypted_credentials: sealCredentials(org, { ...credentials, token: result.access_token }),
        token_expires_at: new Date(Date.now() + result.expires_in * 1000).toISOString(),
        refresh_lease_until: null,
      })
      .eq("organization_id", org)
      .eq("provider", "guesty");
    if (writeError) throw new Error("provider_unavailable");
    return result.access_token;
  } catch (error) {
    await db
      .from("pms_connections")
      .update({ refresh_lease_until: null })
      .eq("organization_id", org)
      .eq("provider", "guesty");
    throw error;
  }
}
async function authorized(org: string, path: string) {
  const bearer = await token(org);
  try {
    return await request(path, {
      headers: { authorization: `Bearer ${bearer}`, accept: "application/json" },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "provider_credentials_invalid")
      await db
        .from("pms_connections")
        .update({ token_expires_at: null, last_success_at: null })
        .eq("organization_id", org)
        .eq("provider", "guesty");
    throw error;
  }
}
export async function guestyList(org: string, offset: number) {
  const page = guestyPage(
    await authorized(
      org,
      `/v1/listings?limit=100&skip=${offset}&fields=_id%20title%20nickname%20address%20pictures`,
    ),
    offset,
  );
  const { error } = await db
    .from("pms_connections")
    .update({ last_success_at: new Date().toISOString() })
    .eq("organization_id", org)
    .eq("provider", "guesty");
  if (error) throw new Error("provider_unavailable");
  return page;
}
export async function guestyProperty(org: string, id: string) {
  return normalizeGuesty(await authorized(org, `/v1/listings/${encodeURIComponent(id)}`));
}
export async function guestyStatus(org: string) {
  const { data, error } = await db
    .from("pms_connections")
    .select("last_success_at")
    .eq("organization_id", org)
    .eq("provider", "guesty")
    .maybeSingle();
  if (error) throw new Error("provider_unavailable");
  return {
    configured: providerEncryptionConfigured(),
    connected: !!data?.last_success_at,
    lastSuccess: data?.last_success_at ?? null,
  };
}
export async function disconnectGuesty(org: string) {
  const { error } = await db
    .from("pms_connections")
    .delete()
    .eq("organization_id", org)
    .eq("provider", "guesty");
  if (error) throw new Error("provider_unavailable");
  return { ok: true };
}
