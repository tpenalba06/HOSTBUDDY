// Additive acquired service contract, kept separate from regenerated backend types.
import type { Database as GeneratedDatabase, Json } from "@/integrations/supabase/types";
export type { Json } from "@/integrations/supabase/types";
type OrderFields = {
  booking_details?: Json;
  booking_request_id?: string | null;
  guest_receipt_hash?: string | null;
};
type ServiceFields = {
  booking_config?: Json;
  property_ids?: string[] | null;
  image_paths?: Json;
  deleted_at?: string | null;
};
type ExtendedTable<T extends { Row: unknown; Insert: unknown; Update: unknown }, Fields> = Omit<
  T,
  "Row" | "Insert" | "Update"
> & { Row: T["Row"] & Fields; Insert: T["Insert"] & Fields; Update: T["Update"] & Fields };
export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<GeneratedDatabase["public"], "Tables" | "Functions"> & {
    Tables: Omit<GeneratedDatabase["public"]["Tables"], "orders" | "services"> & {
      orders: ExtendedTable<GeneratedDatabase["public"]["Tables"]["orders"], OrderFields>;
      services: ExtendedTable<GeneratedDatabase["public"]["Tables"]["services"], ServiceFields>;
    };
    Functions: GeneratedDatabase["public"]["Functions"] & {
      submit_service_booking: {
        Args: {
          _slug: string;
          _service: string;
          _name: string;
          _contact: string;
          _quantity: number;
          _requested_for: string | null;
          _fingerprint: string;
          _request_id: string;
          _receipt_hash: string;
          _option?: string | null;
          _details?: string;
          _terms?: boolean;
          _revision?: string;
        };
        Returns: Json;
      };
      read_service_booking: { Args: { _order: string; _receipt_hash: string }; Returns: Json };
      read_service_booking_request: {
        Args: { _request: string; _receipt_hash: string };
        Returns: Json;
      };
      service_order_payment_states: { Args: { _org: string }; Returns: Json };
      save_service_catalog: {
        Args: { _org: string; _property: string; _service: string; _values: Json };
        Returns: Json;
      };
    };
  };
};
export type Tables<Name extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][Name]["Row"];
