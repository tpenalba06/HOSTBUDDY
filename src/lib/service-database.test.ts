import { expect, it } from "vitest";
import type { Database, Json } from "./service-database";
// These typed values fail the full TypeScript check if a restored service field or RPC disappears.
const order: Pick<
  Database["public"]["Tables"]["orders"]["Row"],
  "booking_details" | "booking_request_id" | "guest_receipt_hash"
> = {
  booking_details: {},
  booking_request_id: null,
  guest_receipt_hash: null,
};
const service: Pick<
  Database["public"]["Tables"]["services"]["Row"],
  "booking_config" | "property_ids" | "image_paths" | "deleted_at"
> = {
  booking_config: {},
  property_ids: [],
  image_paths: {},
  deleted_at: null,
};
type AcquiredRPC = Pick<
  Database["public"]["Functions"],
  | "submit_service_booking"
  | "read_service_booking"
  | "read_service_booking_request"
  | "service_order_payment_states"
  | "save_service_catalog"
>;
const rpc: { [Name in keyof AcquiredRPC]: AcquiredRPC[Name]["Args"] } = {
  submit_service_booking: {
    _slug: "test",
    _service: "test",
    _name: "test",
    _contact: "test",
    _quantity: 1,
    _requested_for: null,
    _fingerprint: "test",
    _request_id: "test",
    _receipt_hash: "test",
  },
  read_service_booking: { _order: "test", _receipt_hash: "test" },
  read_service_booking_request: { _request: "test", _receipt_hash: "test" },
  service_order_payment_states: { _org: "test" },
  save_service_catalog: { _org: "test", _property: "test", _service: "test", _values: {} },
};
const alerts: Database["public"]["Functions"]["nona_report_operational_alert"]["Args"] = {
  _at: "test",
  _event: "test",
  _level: "test",
  _schema: "test",
};
const json: Json = order.booking_details ?? null;
it("retains all acquired service fields, five RPCs and independent alert contracts", () => {
  expect(Object.keys(order)).toHaveLength(3);
  expect(Object.keys(service)).toHaveLength(4);
  expect(Object.keys(rpc)).toHaveLength(5);
  expect(alerts._event).toBe("test");
  expect(json).toEqual({});
});
