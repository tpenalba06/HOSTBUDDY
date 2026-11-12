import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MAX_IMPORT_CHARACTERS } from "./document-extractor";

export const importFromText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ text: z.string().trim().min(2).max(MAX_IMPORT_CHARACTERS) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { analyzeImportDocument } = await import("./intelligence.server");
    return analyzeImportDocument(data.text, {
      localAi: process.env["NONA_IMPORT_LOCAL_AI"] === "true",
    });
  });
