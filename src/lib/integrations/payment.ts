export type GuestPaymentMethod = "card" | "apple_pay" | "google_pay";
export interface PaymentProvider {
  id: string;
  supportedMethods: readonly GuestPaymentMethod[];
  createGuestCheckout(input: { organizationId: string; propertyId: string; serviceId: string; amountCents: number; currency: string }): Promise<{ checkoutUrl: string }>;
}

export const paymentAvailability = { enabled: false, reason: "provider_not_connected" } as const;
