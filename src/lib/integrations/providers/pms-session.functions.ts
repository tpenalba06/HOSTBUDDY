import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Initial read-only import; credentials are ephemeral and are never persisted. */
export const previewPmsImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        organizationId: z.string().uuid(),
        provider: z.enum(["lodgify", "hostaway", "smoobu", "beds24"]),
        key: z.string().trim().min(1).max(2000),
        secret: z.string().max(2000).optional(),
        page: z.number().int().min(1).max(100).default(1),
        externalId: z
          .string()
          .regex(/^[\w-]{1,120}$/)
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: member, error } = await context.supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", data.organizationId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !member || member.role === "member") throw new Error("not_allowed");
    const { readPms } = await import("./pms-session.server");
    return readPms(
      data.provider,
      { key: data.key, secret: data.secret },
      data.page,
      data.externalId,
    );
  });
