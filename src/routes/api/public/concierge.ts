import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/concierge")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { conciergeResponse } = await import("@/lib/concierge.server");
        return conciergeResponse(request);
      },
    },
  },
});
