import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { FriendlyError } from "./properties";

export type Service = Tables<"services">;
export type Order = Tables<"orders"> & {
  properties: { name: string } | null;
  services: { name: string } | null;
};
export type GuestFeedback = Tables<"guest_feedback"> & { properties: { name: string } | null };

const fail = (
  error: unknown,
  message = "Cette action n’est pas disponible pour le moment.",
): never => {
  console.error(error);
  throw new FriendlyError(message);
};

export async function listOrders(orgId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*,properties(name),services(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) return fail(error);
  return data as Order[];
}

export async function updateOrderStatus(
  id: string,
  status: "pending" | "confirmed" | "completed" | "cancelled",
) {
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) fail(error);
}

export async function listFeedback(orgId: string) {
  const { data, error } = await supabase
    .from("guest_feedback")
    .select("*,properties(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) return fail(error);
  return data as GuestFeedback[];
}

export async function markFeedbackRead(id: string) {
  const { error } = await supabase
    .from("guest_feedback")
    .update({ is_read: true, status: "reviewed" })
    .eq("id", id);
  if (error) fail(error);
}

export async function listServices(orgId: string, propertyId?: string) {
  let query = supabase
    .from("services")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at");
  if (propertyId) query = query.or(`property_id.is.null,property_id.eq.${propertyId}`);
  const { data, error } = await query;
  if (error) return fail(error);
  return data;
}

export async function saveService(
  orgId: string,
  propertyId: string,
  values: {
    id?: string;
    name: string;
    description: string;
    price: number;
    pricingType: "fixed" | "per_person";
    isActive: boolean;
  },
) {
  const payload = {
    organization_id: orgId,
    property_id: propertyId,
    name: values.name.trim().slice(0, 120),
    description: values.description.trim().slice(0, 1000),
    price: Math.max(0, values.price),
    pricing_type: values.pricingType,
    is_active: values.isActive,
  };
  const response = values.id
    ? await supabase.from("services").update(payload).eq("id", values.id).select("*").single()
    : await supabase.from("services").insert(payload).select("*").single();
  if (response.error) return fail(response.error);
  if (values.isActive) {
    const { data: sections, error } = await supabase
      .from("guide_sections")
      .select("id")
      .eq("property_id", propertyId)
      .like("section_key", "services%")
      .limit(1);
    if (error) return fail(error);
    if (!sections?.length) {
      const { error: insertError } = await supabase.from("guide_sections").insert({
        property_id: propertyId,
        section_key: "services",
        title: "Services additionnels",
        icon: "✨",
        sort_order: 6,
        is_visible: true,
        content: { items: [], explicitlyEnabled: true },
      });
      if (insertError) return fail(insertError);
    }
  }
  return response.data;
}

export async function dashboardMetrics(orgId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [properties, conversations, orders, feedback] = await Promise.all([
    supabase
      .from("properties")
      .select("id,status")
      .eq("organization_id", orgId)
      .neq("status", "archived"),
    supabase
      .from("conversations")
      .select("id,messages(sender_type,read_at)")
      .eq("organization_id", orgId),
    supabase
      .from("orders")
      .select("status,total_amount,requested_for,created_at")
      .eq("organization_id", orgId),
    supabase
      .from("guest_feedback")
      .select("id,rating,is_read,created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  const error = properties.error ?? conversations.error ?? orders.error ?? feedback.error;
  if (error) return fail(error);
  const orderRows = orders.data ?? [];
  return {
    properties: properties.data?.length ?? 0,
    published: properties.data?.filter((item) => item.status === "published").length ?? 0,
    unread:
      conversations.data?.reduce(
        (count, item) =>
          count +
          item.messages.filter((message) => message.sender_type === "guest" && !message.read_at)
            .length,
        0,
      ) ?? 0,
    todayOrders: orderRows.filter(
      (item) =>
        new Date(item.requested_for ?? item.created_at) >= today &&
        item.status !== "completed" &&
        item.status !== "cancelled",
    ).length,
    requestTotal: orderRows
      .filter((item) => item.status !== "cancelled")
      .reduce((sum, item) => sum + Number(item.total_amount), 0),
    recentFeedback: feedback.data ?? [],
  };
}
