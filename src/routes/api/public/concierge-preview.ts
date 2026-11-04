import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/concierge-preview")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { conciergePreviewHealth } = await import("@/lib/concierge-preview-health.server");
        return conciergePreviewHealth(request);
      },
      POST: async ({ request }) => {
        const { conciergePreviewResponse } = await import("@/lib/concierge-preview.server");
        return conciergePreviewResponse(request);
      },
    },
  },
});
