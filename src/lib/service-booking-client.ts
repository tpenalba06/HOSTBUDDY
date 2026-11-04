import type { ConciergeDraft } from "./concierge";
export type BookingReceipt = {
  id: string;
  amount: number;
  status: string;
  paymentStatus?: string | undefined;
};
export interface BookingTransport {
  mode: "public" | "demo";
  submit(payload: Record<string, unknown>): Promise<BookingReceipt>;
  read(identity: {
    orderId?: string;
    requestId?: string;
    token: string;
  }): Promise<BookingReceipt | null>;
  simulatePayment?: (id: string) => Promise<BookingReceipt>;
}
export const publicBookingTransport: BookingTransport = {
  mode: "public",
  async submit(payload) {
    const response = await fetch("/api/public/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("booking_unavailable");
    return (await response.json()).booking;
  },
  async read(identity) {
    const response = await fetch("/api/public/order-status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(identity),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("booking_unavailable");
    return response.json();
  },
};
export type BookingPrefill = Pick<
  ConciergeDraft,
  "quantity" | "optionId" | "requestedFor" | "date" | "time"
>;
