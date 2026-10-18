import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
export const deletePropertyPermanently = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ propertyId: z.string().uuid(), confirmedName: z.string().min(1).max(120) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { deletePropertyOnServer } = await import("./property-deletion.server");
    const { syncOrganizationBilling } = await import("@/lib/integrations/payments.server");
    return deletePropertyOnServer(context.supabase, supabaseAdmin, data, syncOrganizationBilling);
  });

/** Pending Storage jobs are visible/retryable only through their admin RLS policy. */
export const listPropertyDeletionCleanup = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ organizationId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const db = context.supabase as unknown as import("@supabase/supabase-js").SupabaseClient<
      import("./property-deletion.server").DeletionDatabase
    >;
    const result = await db
      .from("property_deletion_cleanup")
      .select("property_id,confirmed_name")
      .eq("organization_id", data.organizationId);
    // Keep the property list usable while the additive migration is awaiting preview rollout.
    if (result.error?.code === "42P01" || result.error?.code === "PGRST205") return [];
    if (result.error) throw new Error("Le suivi des suppressions est indisponible.");
    return result.data ?? [];
  });
