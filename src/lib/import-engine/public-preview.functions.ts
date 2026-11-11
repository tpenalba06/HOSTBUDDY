import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const importPublicPreview = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ url: z.string().url().max(2000) }).parse(input))
  .handler(async ({ data }) => {
    const { runPublicPreview } = await import("./public-preview.server");
    return runPublicPreview(data.url);
  });
