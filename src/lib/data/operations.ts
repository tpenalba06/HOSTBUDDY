import { supabase } from "@/lib/service-database-client";
import type { Json, Tables } from "@/lib/service-database";
import { FriendlyError, listProperties, uploadSectionMedia } from "./properties";
import { bookingConfigSchema, type BookingConfig } from "@/lib/service-booking";

export type Service = Tables<"services">;
export type Order = Tables<"orders"> & {
  order_payments?: { status: string }[] | null;
  properties: { name: string } | null;
  services: { name: string } | null;
};
export type GuestFeedback = Tables<"guest_feedback"> & { properties: { name: string } | null };

const fail = (
  error: unknown,
  message = "Cette action n’est pas disponible pour le moment.",
): never => {
  const code =
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    /^[A-Z0-9]{5,12}$/.test(error.code)
      ? error.code
      : "unavailable";
  console.error(`NONA_OPERATION_FAILURE ${code}`);
  throw new FriendlyError(message);
};

export async function listOrders(orgId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*,properties(name),services(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) return fail(error);
  const states = await supabase.rpc("service_order_payment_states", { _org: orgId });
  if (states.error && !["42883", "PGRST202"].includes(states.error.code)) return fail(states.error);
  const rows = Array.isArray(states.data) ? (states.data as { id: string; status: string }[]) : [];
  return (data as Order[]).map((order) => ({
    ...order,
    order_payments: rows
      .filter((item) => item.id === order.id)
      .map((item) => ({ status: item.status })),
  }));
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
  query = query.is("deleted_at", null);
  let { data, error } = await query;
  if (error && ["42703", "PGRST204"].includes(error.code)) {
    const legacy = await supabase
      .from("services")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at");
    data = legacy.data;
    error = legacy.error;
  }
  if (error) return fail(error);
  if (!data) return [];
  return propertyId
    ? data.filter((item) =>
        item.property_ids
          ? item.property_ids.includes(propertyId)
          : !item.property_id || item.property_id === propertyId,
      )
    : data;
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
    imagePath?: string | null;
    propertyIds?: string[];
    bookingConfig?: BookingConfig;
  },
) {
  if (values.imagePath) {
    const { data: photo, error } = await supabase
      .from("section_media")
      .select("id")
      .eq("organization_id", orgId)
      .eq("property_id", propertyId)
      .eq("media_type", "image")
      .eq("storage_path", values.imagePath)
      .maybeSingle();
    if (error || !photo) throw new FriendlyError("Choisissez une photo de ce logement.");
  }
  if (
    !Number.isFinite(values.price) ||
    values.price < 0 ||
    values.price > 999999 ||
    (values.price > 0 && values.price < 0.5)
  )
    throw new FriendlyError("Le prix doit être gratuit ou au moins égal à 0,50 €.");
  const config = bookingConfigSchema.parse(values.bookingConfig ?? {});
  const current = values.id
    ? await supabase
        .from("services")
        .select("property_id,image_paths")
        .eq("organization_id", orgId)
        .eq("id", values.id)
        .maybeSingle()
    : null;
  if (current?.error) return fail(current.error);
  const propertyIds = [...new Set(values.propertyIds ?? [propertyId])];
  if (!propertyIds.length) throw new FriendlyError("Choisissez au moins un logement.");
  const paths =
    current?.data?.image_paths &&
    typeof current.data.image_paths === "object" &&
    !Array.isArray(current.data.image_paths)
      ? current.data.image_paths
      : {};
  const payload = {
    organization_id: orgId,
    property_id: current?.data ? current.data.property_id : propertyId,
    property_ids: propertyIds,
    booking_config: config as unknown as Json,
    image_paths: {
      ...paths,
      ...(values.imagePath !== undefined ? { [propertyId]: values.imagePath } : {}),
    } as Json,
    name: values.name.trim().slice(0, 120),
    description: values.description.trim().slice(0, 1000),
    price: Math.max(0, values.price),
    pricing_type: values.pricingType,
    is_active: values.isActive,
    ...(values.imagePath !== undefined &&
    (!current?.data || current.data.property_id === propertyId)
      ? { image_path: values.imagePath }
      : {}),
  };
  const response = await supabase.rpc("save_service_catalog", {
    _org: orgId,
    _property: propertyId,
    _service: values.id ?? crypto.randomUUID(),
    _values: payload as unknown as Json,
  });
  if (response.error) return fail(response.error);
  return response.data as unknown as Service;
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
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
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
        new Date(item.requested_for ?? item.created_at) < tomorrow &&
        item.status !== "completed" &&
        item.status !== "cancelled",
    ).length,
    requestTotal: orderRows
      .filter((item) => item.status !== "cancelled")
      .reduce((sum, item) => sum + Number(item.total_amount), 0),
    recentFeedback: feedback.data ?? [],
  };
}

export async function listServicePhotos(orgId: string, propertyId: string) {
  const { data, error } = await supabase
    .from("section_media")
    .select("id,storage_path,alt_text,guide_sections!inner(is_visible)")
    .eq("organization_id", orgId)
    .eq("property_id", propertyId)
    .eq("media_type", "image")
    .eq("guide_sections.is_visible", true)
    .order("sort_order");
  if (error) return fail(error);
  if (!data.length) return [];
  const signed = await supabase.storage.from("guide-media").createSignedUrls(
    data.map((item) => item.storage_path),
    900,
  );
  if (signed.error) return fail(signed.error);
  const urls = new Map(signed.data.map((item) => [item.path, item.signedUrl]));
  return data.map((item) => ({
    path: item.storage_path,
    url: urls.get(item.storage_path) ?? "",
    label: item.alt_text ?? "",
  }));
}

export async function deleteService(orgId: string, id: string) {
  // Retain the service and all past orders/financial references. Hide immediately.
  const { error } = await supabase
    .from("services")
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq("organization_id", orgId)
    .eq("id", id);
  if (error) return fail(error);
}
export async function uploadServicePhoto(orgId: string, propertyId: string, file: File) {
  if (!file.type.startsWith("image/")) throw new FriendlyError("Choisissez une photo.");
  const sections = await supabase
    .from("guide_sections")
    .select("id")
    .eq("property_id", propertyId)
    .like("section_key", "services%")
    .limit(1);
  if (sections.error) return fail(sections.error);
  let sectionId = sections.data[0]?.id;
  if (!sectionId) {
    const created = await supabase
      .from("guide_sections")
      .insert({
        property_id: propertyId,
        section_key: "services",
        title: "Services additionnels",
        icon: "✨",
        sort_order: 6,
        is_visible: true,
        content: { items: [], explicitlyEnabled: true },
      })
      .select("id")
      .single();
    if (created.error) return fail(created.error);
    sectionId = created.data.id;
  }
  return uploadSectionMedia(orgId, propertyId, sectionId, file);
}
export { listProperties as listServiceProperties };
