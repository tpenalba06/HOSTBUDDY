import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const orgInput = z.object({ organizationId: z.string().uuid() });
const roleInput = orgInput.extend({ role: z.enum(["owner", "admin", "member"]) });

export const getTeam = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).inputValidator((data) => orgInput.parse(data)).handler(async ({ data, context }) => {
  const { data: role } = await context.supabase.from("organization_members").select("role").eq("organization_id", data.organizationId).eq("user_id", context.userId).maybeSingle();
  if (role?.role !== "owner") throw new Response("Forbidden", { status: 403 });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: members, error } = await supabaseAdmin.rpc("get_organization_team", { _org: data.organizationId });
  if (error) throw new Error("team unavailable");
  return members;
});

export const inviteTeamMember = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => roleInput.extend({ email: z.string().email().max(320) }).parse(data)).handler(async ({ data, context }) => {
  const { error } = await context.supabase.rpc("invite_organization_member", { _org: data.organizationId, _email: data.email, _role: data.role });
  if (error) throw new Error("invite unavailable");
  return { ok: true };
});

export const changeTeamRole = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => roleInput.extend({ userId: z.string().uuid() }).parse(data)).handler(async ({ data, context }) => {
  const { error } = await context.supabase.rpc("change_organization_member_role", { _org: data.organizationId, _user: data.userId, _role: data.role });
  if (error) throw new Error("role unavailable");
  return { ok: true };
});

export const removeTeamMember = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => orgInput.extend({ userId: z.string().uuid() }).parse(data)).handler(async ({ data, context }) => {
  const { error } = await context.supabase.rpc("remove_organization_member", { _org: data.organizationId, _user: data.userId });
  if (error) throw new Error("remove unavailable");
  return { ok: true };
});