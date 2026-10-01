import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export interface PublicSection {
  key: string;
  title: string;
  content: { items?: { label: string; text: string }[]; phones?: string[]; emails?: string[] };
}
export interface PublicGuide { name: string; sections: PublicSection[] }

// Public read path: only the security-definer RPC (published + visible only).
export const getPublicGuide = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data }): Promise<PublicGuide | null> => {
    const sb = createClient<Database>(process.env['SUPABASE_URL']!, process.env['SUPABASE_PUBLISHABLE_KEY']!, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data: guide, error } = await sb.rpc("get_public_guide", { _slug: data.slug });
    if (error) { console.error(error); throw new Error("unavailable"); }
    return (guide as unknown as PublicGuide | null) ?? null;
  });
