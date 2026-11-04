import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FIELD_DEFS } from "@/lib/import-engine/fields";
const schema = z.object({
  organizationId: z.string().uuid(),
  action: z.enum(["status", "connect", "list", "import", "disconnect"]),
  clientId: z.string().max(500).optional(),
  clientSecret: z.string().max(2000).optional(),
  offset: z.number().int().min(0).max(100000).optional(),
  externalId: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{1,120}$/)
    .optional(),
});
export const manageGuesty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: membership, error } = await context.supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", data.organizationId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !membership || membership.role === "member") throw new Error("not_allowed");
    const server = await import("./guesty.server");
    switch (data.action) {
      case "status":
        return { status: await server.guestyStatus(data.organizationId) };
      case "connect":
        if (!data.clientId?.trim() || !data.clientSecret?.trim())
          throw new Error("provider_credentials_invalid");
        await server.saveGuestyCredentials(
          data.organizationId,
          data.clientId.trim(),
          data.clientSecret.trim(),
        );
        return { status: await server.guestyStatus(data.organizationId) };
      case "list":
        return { page: await server.guestyList(data.organizationId, data.offset ?? 0) };
      case "disconnect":
        return await server.disconnectGuesty(data.organizationId);
      case "import": {
        if (!data.externalId) throw new Error("invalid_request");
        const property = await server.guestyProperty(data.organizationId, data.externalId);
        const fields = FIELD_DEFS.map((definition) => {
          const imported = property.fields.find((field) => field.key === definition.key);
          return {
            key: definition.key,
            category: definition.category,
            label: definition.label,
            essential: definition.essential,
            question: definition.question,
            value: imported?.value ?? null,
            rawValue: imported?.rawValue ?? null,
            confidence: imported?.confidence ?? 0,
          };
        });
        const { data: id, error: importError } = await context.supabase.rpc(
          "create_provider_draft",
          {
            _org: data.organizationId,
            _provider: "guesty",
            _external: property.externalId,
            _name: property.name ?? "",
            _fields: fields,
          },
        );
        if (importError || !id) throw new Error("provider_import_failed");
        return { propertyId: id };
      }
    }
  });
