import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
/** Admin property edits can trigger reconciliation, but never choose a quantity or price. */
export const reconcileBilling = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ organizationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: membership, error } = await context.supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", data.organizationId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !membership || !["owner", "admin"].includes(membership.role))
      throw new Error("not_allowed");
    const { syncOrganizationBilling } = await import("./payments.server");
    return syncOrganizationBilling(data.organizationId);
  });
