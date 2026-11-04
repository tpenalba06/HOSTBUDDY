import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { readOrganizationTeam, requireOrganizationOwner } from "./team-access";

const orgInput = z.object({ organizationId: z.string().uuid() });
const roleInput = orgInput.extend({ role: z.enum(["admin", "member"]) });

export const getTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => orgInput.parse(data))
  .handler(async ({ data, context }) => {
    return readOrganizationTeam(context.supabase, data.organizationId, context.userId);
  });

export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => roleInput.extend({ email: z.string().email().max(320) }).parse(data))
  .handler(async ({ data, context }) => {
    await requireOrganizationOwner(context.supabase, data.organizationId, context.userId);
    const { error } = await context.supabase.rpc("invite_organization_member", {
      _org: data.organizationId,
      _email: data.email,
      _role: data.role,
    });
    if (error) throw new Error("invite unavailable");
    return { ok: true };
  });

export const changeTeamRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => roleInput.extend({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireOrganizationOwner(context.supabase, data.organizationId, context.userId);
    const { error } = await context.supabase.rpc("change_organization_member_role", {
      _org: data.organizationId,
      _user: data.userId,
      _role: data.role,
    });
    if (error) throw new Error("role unavailable");
    return { ok: true };
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => orgInput.extend({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireOrganizationOwner(context.supabase, data.organizationId, context.userId);
    const { error } = await context.supabase.rpc("remove_organization_member", {
      _org: data.organizationId,
      _user: data.userId,
    });
    if (error) throw new Error("remove unavailable");
    return { ok: true };
  });
