import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
const schema = z.object({
  organizationId: z.string().uuid(),
  action: z.enum(["overview", "billing", "portal", "connect", "payment_link", "refund"]),
  id: z.string().uuid().optional(),
  feeTermsAccepted: z.boolean().optional(),
});
export const managePayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const server = await import("./payments.server");
    await server.requireOwner(data.organizationId, context.userId);
    try {
      switch (data.action) {
        case "overview":
          return { overview: await server.paymentOverview(data.organizationId) };
        case "billing":
          return await server.startBilling(data.organizationId);
        case "portal":
          return await server.startPortal(data.organizationId);
        case "connect":
          return await server.connectOnboarding(
            data.organizationId,
            data.feeTermsAccepted === true,
          );
        case "payment_link":
          if (!data.id) throw new Error("invalid_request");
          return await server.createOrderPaymentLink(data.organizationId, data.id);
        case "refund":
          if (!data.id) throw new Error("invalid_request");
          return await server.refundOrderPayment(data.organizationId, data.id);
      }
    } catch {
      throw new Error("payment_unavailable");
    }
  });
