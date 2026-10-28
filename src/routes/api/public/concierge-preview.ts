import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/concierge-preview")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { conciergePreviewResponse } = await import("@/lib/concierge-preview.server");
        return conciergePreviewResponse(request);
      },
    },
  },
});
