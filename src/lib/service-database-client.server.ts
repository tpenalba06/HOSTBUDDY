import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin as generatedClient } from "@/integrations/supabase/client.server";
import type { Database } from "./service-database";
// Same privileged client; consumers retain their existing authorization boundaries.
export const supabaseAdmin = generatedClient as unknown as SupabaseClient<Database>;
