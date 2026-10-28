import type { ManagerOrder } from "@/components/app/ManagerScreens";
import type { PublicGuide } from "@/lib/data/public-guide.functions";
import type { BookingTransport, BookingReceipt } from "@/lib/service-booking-client";
import { readBookingConfig, serviceTotalCents } from "@/lib/service-booking";

// Browser-memory simulation only. Never imported by a server endpoint, persisted
// to an account, or presented as a Stripe payment. Separate from real receipts.
const rows = new Map<
  string,
  { row: ManagerOrder; token: string; request: string; signature: string }
>();
export const DEMO_BOOKING_EVENT = "nona-demo-booking-updated";
const changed = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(DEMO_BOOKING_EVENT));
};
export const demoBookingOrders = () => [...rows.values()].map((item) => item.row);
export function updateDemoBooking(id: string, status: ManagerOrder["status"]) {
  const record = rows.get(id);
  if (!record) return;
  if (status === "completed" && !record.row.order_payments?.some((p) => p.status === "paid"))
    return;
  record.row = {
    ...record.row,
    status,
    ...(status === "confirmed" ? { order_payments: [{ status: "pending" }] } : {}),
  };
  changed();
}
function receipt(row: ManagerOrder): BookingReceipt {
  return {
    id: row.id,
    amount: Number(row.total_amount),
    status: row.status,
    paymentStatus: row.order_payments?.[0]?.status,
  };
}
export function demoBookingTransport(guide: PublicGuide): BookingTransport {
  return {
    mode: "demo",
    async submit(payload) {
      const token = String(payload["receiptToken"]),
        request = String(payload["requestId"]);
      const signature = JSON.stringify(payload);
      const old = [...rows.values()].find((value) => value.request === request);
      if (old) {
        if (old.token !== token || old.signature !== signature) throw new Error("demo_conflict");
        return receipt(old.row);
      }
      const service = guide.services?.find((s) => s.id === payload["serviceId"]);
      if (rows.size >= 30) throw new Error("demo_limit");
      if (!service || payload["termsAccepted"] !== true) throw new Error("demo_unavailable");
      const config = readBookingConfig(service.bookingConfig);
      const total = serviceTotalCents(
        service.price,
        Number(payload["quantity"]),
        config,
        typeof payload["optionId"] === "string" ? payload["optionId"] : undefined,
      );
      const requested =
        typeof payload["requestedFor"] === "string" ? payload["requestedFor"] : null;
      if (
        config.slots.length &&
        (!requested || !config.slots.includes(requested) || Date.parse(requested) <= Date.now())
      )
        throw new Error("demo_slot_unavailable");
      const id = crypto.randomUUID();
      const row: ManagerOrder = {
        id,
        status: "pending",
        created_at: new Date().toISOString(),
        requested_for: requested,
        total_amount: total / 100,
        guest_name: String(payload["name"]),
        guest_contact: String(payload["contact"]),
        quantity: Number(payload["quantity"]),
        booking_request_id: request,
        services: { name: service.name },
        properties: { name: guide.name },
        booking_details: {
          details: String(payload["details"] ?? ""),
          optionLabel: config.options.find((o) => o.id === payload["optionId"])?.label ?? "",
          seller: config.seller,
          cancellation: config.cancellation,
        },
      };
      rows.set(id, { row, token, request, signature });
      changed();
      return receipt(row);
    },
    async read(identity) {
      const record = [...rows.values()].find(
        (item) =>
          (identity.orderId
            ? item.row.id === identity.orderId
            : item.request === identity.requestId) && item.token === identity.token,
      );
      return record ? receipt(record.row) : null;
    },
    async simulatePayment(id) {
      const record = rows.get(id);
      if (
        !record ||
        record.row.status !== "confirmed" ||
        record.row.order_payments?.[0]?.status !== "pending"
      )
        throw new Error("demo_not_payable");
      record.row = { ...record.row, order_payments: [{ status: "paid" }] };
      changed();
      return receipt(record.row);
    },
  };
}
