import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MAX_IMPORT_CHARACTERS } from "./document-extractor";
import { HTML_SNAPSHOT_LIMIT } from "./html-snapshot";

export const importHtmlSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        html: z.string().min(2).max(HTML_SNAPSHOT_LIMIT),
        rightsConfirmed: z.literal(true),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { readHtmlSnapshot } = await import("./html-snapshot.server");
    return readHtmlSnapshot(data.html);
  });

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
