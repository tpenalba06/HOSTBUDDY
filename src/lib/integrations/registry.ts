import { PMS_READINESS, type PmsReadiness } from "./pms-readiness";
export type IntegrationCategory =
  | "listing_import"
  | "payments"
  | "social_media"
  | "pms"
  | "personalization"
  | "ai"
  | "local_recommendations"
  | "translation"
  | "smart_access";

export type IntegrationCapabilityType =
  | "import_source"
  | "official_connector"
  | "payment_provider"
  | "payment_method"
  | "embed_provider"
  | "content_provider"
  | "map_provider"
  | "ai_provider"
  | "translation_provider"
  | "smart_access_provider";

export type IntegrationStatus = "available" | "beta" | "planned";
export type IntegrationAuthMethod = "oauth" | "api_key" | "embed" | "link" | "internal";

export interface IntegrationDefinition {
  id: string;
  name: string;
  category: IntegrationCategory;
  capabilityType: IntegrationCapabilityType;
  status: IntegrationStatus;
  connectMethod: IntegrationAuthMethod;
  capabilities: readonly string[];
  logoPlaceholder: string;
  docsUrl?: string;
  countries?: readonly string[];
  marketingVisible: boolean;
  note?: string;
  readiness?: PmsReadiness;
}

const integration = <T extends IntegrationDefinition>(definition: T) => definition;

export const INTEGRATIONS = [
  integration({
    id: "generic-web",
    name: "Site web public",
    category: "listing_import",
    capabilityType: "import_source",
    status: "available",
    connectMethod: "link",
    capabilities: ["single_property_import", "metadata_import", "text_fallback"],
    logoPlaceholder: "WEB",
    marketingVisible: true,
    note: "Pages publiquement accessibles uniquement.",
  }),
  integration({
    id: "pasted-text",
    name: "Texte libre",
    category: "listing_import",
    capabilityType: "import_source",
    status: "available",
    connectMethod: "internal",
    capabilities: ["single_property_import", "structured_extraction", "provenance"],
    logoPlaceholder: "TXT",
    marketingVisible: true,
  }),
  integration({
    id: "airbnb",
    name: "Airbnb",
    category: "listing_import",
    capabilityType: "import_source",
    status: "beta",
    connectMethod: "link",
    capabilities: ["single_property_import", "text_fallback"],
    logoPlaceholder: "AB",
    marketingVisible: true,
    note: "Import depuis un lien public, avec repli vers le texte de l’annonce.",
  }),
  integration({
    id: "booking",
    name: "Booking.com",
    category: "listing_import",
    capabilityType: "import_source",
    status: "beta",
    connectMethod: "link",
    capabilities: ["single_property_import", "text_fallback"],
    logoPlaceholder: "B",
    marketingVisible: true,
    note: "Import depuis un lien public, avec repli vers le texte de l’annonce.",
  }),
  integration({
    id: "sunver",
    name: "Sunver",
    category: "listing_import",
    capabilityType: "import_source",
    status: "beta",
    connectMethod: "link",
    capabilities: ["single_property_import", "text_fallback"],
    logoPlaceholder: "S",
    marketingVisible: true,
    note: "Import depuis une page publique, sans partenariat revendiqué.",
  }),
  ...["Vrbo", "Expedia", "Agoda", "Tripadvisor"].map((name) =>
    integration({
      id: name.toLowerCase(),
      name,
      category: "listing_import" as const,
      capabilityType: "import_source" as const,
      status: "planned" as const,
      connectMethod: "link" as const,
      capabilities: ["single_property_import"],
      logoPlaceholder: name.slice(0, 2).toUpperCase(),
      marketingVisible: true,
    }),
  ),

  integration({
    id: "stripe",
    name: "Stripe",
    category: "payments",
    capabilityType: "payment_provider",
    status: "planned",
    connectMethod: "oauth",
    capabilities: ["guest_checkout", "payouts", "refunds"],
    logoPlaceholder: "ST",
    marketingVisible: true,
  }),
  integration({
    id: "apple-pay",
    name: "Apple Pay",
    category: "payments",
    capabilityType: "payment_method",
    status: "planned",
    connectMethod: "internal",
    capabilities: ["guest_checkout_via_payment_provider"],
    logoPlaceholder: "AP",
    marketingVisible: true,
    note: "Moyen de paiement proposé via le prestataire de paiement.",
  }),
  integration({
    id: "google-pay",
    name: "Google Pay",
    category: "payments",
    capabilityType: "payment_method",
    status: "planned",
    connectMethod: "internal",
    capabilities: ["guest_checkout_via_payment_provider"],
    logoPlaceholder: "GP",
    marketingVisible: true,
    note: "Moyen de paiement proposé via le prestataire de paiement.",
  }),

  ...(
    [
      ["instagram", "Instagram", "embed"],
      ["youtube", "YouTube", "embed"],
      ["facebook", "Facebook", "link"],
      ["tiktok", "TikTok", "embed"],
      ["vimeo", "Vimeo", "embed"],
      ["linkedin", "LinkedIn", "link"],
    ] as const
  ).map(([id, name, method]) =>
    integration({
      id,
      name,
      category: "social_media" as const,
      capabilityType: "embed_provider" as const,
      status: "planned" as const,
      connectMethod: method,
      capabilities: method === "embed" ? ["official_embed"] : ["official_link"],
      logoPlaceholder: name.slice(0, 2).toUpperCase(),
      marketingVisible: true,
    }),
  ),

  ...(
    [
      ["guesty", "Guesty", "oauth"],
      ["hostaway", "Hostaway", "oauth"],
      ["beds24", "Beds24", "api_key"],
      ["superhote", "Superhôte", "api_key"],
      ["lodgify", "Lodgify", "api_key"],
      ["smoobu", "Smoobu", "api_key"],
      ["cloudbeds", "Cloudbeds", "api_key"],
      ["mews", "Mews", "api_key"],
      ["rental-ready", "Rental Ready", "api_key"],
      ["amenitiz", "Amenitiz", "oauth"],
      ["eviivo", "eviivo", "oauth"],
    ] as const
  ).map(([id, name, method]) =>
    integration({
      id,
      name,
      category: "pms" as const,
      capabilityType: "official_connector" as const,
      status: "planned" as const,
      connectMethod: method,
      capabilities: [
        "connection_test",
        "bulk_property_list",
        "bulk_property_import",
        "provenance_sync",
      ],
      logoPlaceholder: name.slice(0, 2).toUpperCase(),
      marketingVisible: true,
      note: "Connexion officielle à venir pour l’import en nombre.",
      ...(PMS_READINESS[id]
        ? { docsUrl: PMS_READINESS[id].documentation, readiness: PMS_READINESS[id] }
        : {}),
    }),
  ),

  integration({
    id: "google-fonts",
    name: "Google Fonts",
    category: "personalization",
    capabilityType: "content_provider",
    status: "planned",
    connectMethod: "internal",
    capabilities: ["curated_fonts"],
    logoPlaceholder: "GF",
    marketingVisible: true,
  }),
  integration({
    id: "pixabay",
    name: "Pixabay",
    category: "personalization",
    capabilityType: "content_provider",
    status: "planned",
    connectMethod: "api_key",
    capabilities: ["royalty_free_image_search"],
    logoPlaceholder: "PX",
    marketingVisible: true,
  }),
  integration({
    id: "openai",
    name: "OpenAI",
    category: "ai",
    capabilityType: "ai_provider",
    status: "planned",
    connectMethod: "internal",
    capabilities: ["structured_extraction", "content_assistance", "grounded_guest_assistant"],
    logoPlaceholder: "AI",
    marketingVisible: false,
  }),
  integration({
    id: "mistral",
    name: "Mistral AI",
    category: "ai",
    capabilityType: "ai_provider",
    status: "planned",
    connectMethod: "internal",
    capabilities: ["structured_extraction", "content_assistance", "grounded_guest_assistant"],
    logoPlaceholder: "MI",
    marketingVisible: false,
  }),
  integration({
    id: "google-maps",
    name: "Google Maps / Places",
    category: "local_recommendations",
    capabilityType: "map_provider",
    status: "planned",
    connectMethod: "api_key",
    capabilities: ["place_search", "map_links", "route_links"],
    logoPlaceholder: "GM",
    marketingVisible: true,
  }),
  integration({
    id: "getyourguide",
    name: "GetYourGuide",
    category: "local_recommendations",
    capabilityType: "content_provider",
    status: "planned",
    connectMethod: "link",
    capabilities: ["activity_links"],
    logoPlaceholder: "GY",
    marketingVisible: true,
  }),
  integration({
    id: "deepl",
    name: "DeepL",
    category: "translation",
    capabilityType: "translation_provider",
    status: "planned",
    connectMethod: "api_key",
    capabilities: ["machine_translation", "stale_translation_refresh"],
    logoPlaceholder: "DL",
    marketingVisible: true,
  }),
  integration({
    id: "llm-translation",
    name: "Traduction assistée par IA",
    category: "translation",
    capabilityType: "translation_provider",
    status: "planned",
    connectMethod: "internal",
    capabilities: ["machine_translation", "stale_translation_refresh"],
    logoPlaceholder: "IA",
    marketingVisible: true,
  }),
  integration({
    id: "igloohome",
    name: "Igloohome",
    category: "smart_access",
    capabilityType: "smart_access_provider",
    status: "planned",
    connectMethod: "oauth",
    capabilities: ["access_code_sync"],
    logoPlaceholder: "IG",
    marketingVisible: true,
  }),
] as const satisfies readonly IntegrationDefinition[];

export type IntegrationId = (typeof INTEGRATIONS)[number]["id"];
export const INTEGRATION_CATEGORIES: readonly IntegrationCategory[] = [
  "listing_import",
  "pms",
  "payments",
  "social_media",
  "local_recommendations",
  "translation",
  "personalization",
  "smart_access",
  "ai",
];
export const getIntegration = (id: string) => INTEGRATIONS.find((item) => item.id === id);
export const getVisibleIntegrations = (): IntegrationDefinition[] =>
  INTEGRATIONS.filter((item) => item.marketingVisible);
