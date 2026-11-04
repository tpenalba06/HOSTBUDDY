import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as generatedClient } from "@/integrations/supabase/client";
import type { Database } from "./service-database";
// Same client, auth and RLS; only the previously acquired additive contract differs.
export const supabase = generatedClient as unknown as SupabaseClient<Database>;
