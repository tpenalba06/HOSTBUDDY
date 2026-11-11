import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/stay-access")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { guestStayResponse } = await import("@/lib/guest-stay.server");
        return guestStayResponse(request);
      },
    },
  },
});
