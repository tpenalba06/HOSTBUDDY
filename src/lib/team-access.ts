import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function requireOrganizationOwner(
  client: SupabaseClient<Database>,
  organizationId: string,
  userId: string,
) {
  const { data: role, error: roleError } = await client
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (roleError || role?.role !== "owner") throw new Response("Forbidden", { status: 403 });
}

export async function readOrganizationTeam(
  client: SupabaseClient<Database>,
  organizationId: string,
  userId: string,
) {
  await requireOrganizationOwner(client, organizationId, userId);
  // Preserve the user's JWT: the RPC authorizes access using auth.uid().
  const { data, error } = await client.rpc("get_organization_team", { _org: organizationId });
  if (error) throw new Error("team unavailable");
  return data;
}
