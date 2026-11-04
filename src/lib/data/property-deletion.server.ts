import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { z } from "zod";

export type DeletionDatabase = Database & {
  public: {
    Functions: {
      delete_property_permanently: {
        Args: { _property: string; _confirmed_name: string };
        Returns: Json;
      };
    };
    Tables: {
      property_deletion_cleanup: {
        Row: {
          property_id: string;
          organization_id: string;
          confirmed_name: string;
          paths: string[];
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
  };
};
const jobSchema = z.object({
  property_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  confirmed_name: z.string(),
  paths: z.array(z.string()),
});
export async function deletePropertyOnServer(
  authenticated: SupabaseClient<Database>,
  admin: SupabaseClient<Database>,
  input: { propertyId: string; confirmedName: string },
  syncBilling: (org: string) => Promise<{ pending: boolean }>,
) {
  const db = authenticated as unknown as SupabaseClient<DeletionDatabase>;
  const { data, error } = await db.rpc("delete_property_permanently", {
    _property: input.propertyId,
    _confirmed_name: input.confirmedName,
  });
  if (error)
    throw new Error("Suppression refusée. Vérifiez vos droits et le nom exact du logement.");
  const job = jobSchema.parse(data);
  if (
    job.property_id !== input.propertyId ||
    job.confirmed_name !== input.confirmedName ||
    job.paths.some(
      (path) =>
        !path.startsWith(`${job.organization_id}/${job.property_id}/`) ||
        path.split("/").some((part) => part === ".." || part === "."),
    )
  )
    throw new Error("Nettoyage des médias refusé : chemin invalide.");
  // SQL has committed the deletion and queued billing; neither external failure can undo it.
  let billingPending = false;
  try {
    billingPending = (await syncBilling(job.organization_id)).pending;
  } catch {
    billingPending = true;
  }
  try {
    for (let start = 0; start < job.paths.length; start += 100) {
      const result = await admin.storage
        .from("guide-media")
        .remove(job.paths.slice(start, start + 100));
      if (result.error) throw result.error;
    }
    const cleanup = admin as unknown as SupabaseClient<DeletionDatabase>;
    const result = await cleanup
      .from("property_deletion_cleanup")
      .delete()
      .eq("property_id", job.property_id)
      .eq("organization_id", job.organization_id);
    if (result.error) throw result.error;
  } catch {
    return { deleted: true as const, cleanupPending: true, billingPending };
  }
  return { deleted: true as const, cleanupPending: false, billingPending };
}
