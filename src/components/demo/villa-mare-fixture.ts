import type {
  ManagerOrder,
  ManagerConversation,
  ManagerFeedback,
  ManagerTeamMember,
} from "@/components/app/ManagerScreens";
import { translateStatic, type Locale } from "@/lib/i18n";
import type { GuideSection, SectionMedia } from "@/lib/data/properties";
import type { Json } from "@/integrations/supabase/types";
import type { GuideViewData } from "@/components/guest/guide-model";
import { toPublicSections } from "@/components/guest/guide-adapters";
import { getVillaMare, type GuideData } from "@/components/guest/villaMare";
import { createDemoProperty, fieldsFromDemoSections, type DemoProperty } from "./demo-property";

export const VILLA_MARE_ID = "demo-villa-mare";

/** One fixture owns every Villa Mare photo, section and service. No network writes. */
export function createVillaMare(
  locale: Locale,
  data: GuideData = getVillaMare(locale),
): DemoProperty {
  const property = createDemoProperty(VILLA_MARE_ID, { propertyName: data.name, fields: [] });
  const keys = [
    "welcome",
    "wifi",
    "arrival",
    "places",
    "services",
    "departure",
    "contact",
    "house",
    "pool",
  ];
  const media: SectionMedia[] = [];
  const photo = (key: string, url: string, suffix = "photo") => {
    const id = `${VILLA_MARE_ID}-${key}-${suffix}`;
    media.push({
      id,
      organization_id: "demo",
      property_id: VILLA_MARE_ID,
      section_id: `${VILLA_MARE_ID}-${key}`,
      media_type: "image",
      storage_path: url,
      mime_type: "image/webp",
      file_size: 0,
      sort_order: media.length,
      caption: null,
      alt_text: data.name,
      created_at: "",
      updated_at: "",
    });
    return id;
  };
  const galleryIds = data.gallery.map((url, index) => photo("welcome", url, `gallery-${index}`));
  const sections: GuideSection[] = keys.map((key, index) => {
    const content: Record<string, unknown> = { items: [], explicitlyEnabled: true };
    if (key === "welcome")
      content["propertyMedia"] = { version: 1, coverId: galleryIds[0], galleryIds };
    if (key === "wifi")
      content["items"] = [
        {
          fieldKey: "wifi",
          label: translateStatic(locale, "guest.network"),
          text: data.wifi.network,
        },
        { label: translateStatic(locale, "guest.wifiPassword"), text: data.wifi.password },
      ];
    if (["arrival", "departure", "house", "pool"].includes(key))
      content["items"] = [
        {
          fieldKey: key === "house" ? "equipment" : key,
          label: "",
          text: data[key as "arrival" | "departure" | "house" | "pool"],
        },
      ];
    if (key === "contact") {
      content["items"] = [
        { fieldKey: "contact", label: data.host, text: `${data.phone}\n${data.email}` },
      ];
      content["phones"] = [data.phone];
      content["emails"] = [data.email];
    }
    if (key === "places") {
      const categories = {
        fr: ["Plages", "Commerces", "Restaurants"],
        en: ["Beaches", "Shops", "Restaurants"],
        es: ["Playas", "Tiendas", "Restaurantes"],
        de: ["Strände", "Geschäfte", "Restaurants"],
        it: ["Spiagge", "Negozi", "Ristoranti"],
        pt: ["Praias", "Lojas", "Restaurantes"],
      }[locale];
      const photos = [
        data.gallery[2]!,
        data.sectionPhotos["services"]!,
        data.sectionPhotos["places"]!,
      ];
      const ids = photos.map((url, i) => photo(key, url, `place-${i}`));
      content["entries"] = data.places.map((place, i) => ({
        id: `villa-place-${i}`,
        title: place.name,
        text: place.note,
        category: categories[i],
        mediaIds: i === 2 ? [ids[2], ids[0], ids[1]] : [ids[i]],
      }));
    } else if (data.sectionPhotos[key]) photo(key, data.sectionPhotos[key]!);
    return {
      id: `${VILLA_MARE_ID}-${key}`,
      property_id: VILLA_MARE_ID,
      section_key: key,
      title: translateStatic(locale, `section.${key}`),
      icon: "📌",
      cta_label: null,
      sort_order: index,
      is_visible: true,
      content: content as Json,
      created_at: "",
      updated_at: "",
    };
  });
  return {
    ...property,
    name: data.name,
    slug: "villa-mare",
    status: "published",
    location: data.location,
    coverUrl: data.coverUrl,
    sections,
    media,
    fields: fieldsFromDemoSections(property.fields, sections),
    messagingEnabled: true,
    services: data.services.map((service, index) => ({
      id: service.id,
      name: service.name,
      description: service.desc,
      price: service.price,
      pricing_type: "fixed",
      is_active: true,
      image_path:
        index === 0 ? data.sectionPhotos["services"]! : data.gallery[index % data.gallery.length]!,
      organization_id: "demo",
      property_id: VILLA_MARE_ID,
      created_at: "",
      updated_at: "",
    })),
  };
}

/** Identical adapter for the guest demo, homepage phone and local manager preview. */
export function demoGuide(property: DemoProperty): GuideViewData {
  return {
    id: property.id,
    name: property.name,
    ...(property.location ? { subtitle: property.location } : {}),
    originalLocale: "fr",
    ...(property.coverUrl ? { coverUrl: property.coverUrl } : {}),
    messagingEnabled: property.messagingEnabled,
    sections: toPublicSections(property.sections, property.media),
    services: property.services
      .filter((service) => service.is_active)
      .map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        price: Number(service.price),
        pricingType: service.pricing_type as "fixed" | "per_person",
        imagePath: property.media.some((media) => media.storage_path === service.image_path)
          ? service.image_path
          : null,
      })),
  };
}

export function villaMareOperations(villa: DemoProperty, clock = new Date()) {
  const now = clock;
  const isoAt = (hoursFromNow: number) =>
    new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000).toISOString();

  const INITIAL_ORDERS: ManagerOrder[] = [
    {
      id: "demo-order-breakfast",
      status: "pending",
      requested_for: isoAt(2),
      created_at: isoAt(-2),
      total_amount: Number(villa.services[0]!.price),
      guest_name: "Sophie",
      services: { name: villa.services[0]!.name },
      properties: { name: villa.name },
    },
    {
      id: "demo-order-transfer",
      status: "confirmed",
      requested_for: isoAt(28),
      created_at: isoAt(-5),
      total_amount: Number(villa.services[2]!.price),
      guest_name: "Lucas",
      services: { name: villa.services[2]!.name },
      properties: { name: villa.name },
    },
  ];

  const INITIAL_CONVERSATIONS: ManagerConversation[] = [
    {
      id: "demo-conversation-sophie",
      guest_display_name: "Sophie",
      last_message_at: isoAt(-0.5),
      status: "open",
      properties: { name: villa.name },
      messages: [
        {
          id: "demo-message-1",
          sender_type: "guest",
          read_at: null,
          created_at: isoAt(-1),
          body: "Bonjour, où peut-on se garer en arrivant ?",
        },
        {
          id: "demo-message-2",
          sender_type: "manager",
          read_at: isoAt(-0.8),
          created_at: isoAt(-0.8),
          body: "Bonjour Sophie ! Le parking privé est juste devant la villa.",
        },
      ],
    },
  ];

  const INITIAL_FEEDBACK: ManagerFeedback[] = [
    {
      id: "demo-feedback-1",
      rating: 5,
      comment: "Super séjour, le livret était vraiment pratique. Merci !",
      guest_name: "Camille",
      created_at: isoAt(-24),
      is_read: false,
      properties: { name: villa.name },
    },
  ];

  const INITIAL_TEAM: ManagerTeamMember[] = [
    { user_id: "demo-owner", email: "tristan@conciergerie-azur.fr", role: "owner" },
    { user_id: "demo-admin", email: "claire@conciergerie-azur.fr", role: "admin" },
    { user_id: "demo-member", email: "julien@conciergerie-azur.fr", role: "member" },
  ];

  return {
    orders: INITIAL_ORDERS,
    conversations: INITIAL_CONVERSATIONS,
    feedback: INITIAL_FEEDBACK,
    team: INITIAL_TEAM,
  };
}
