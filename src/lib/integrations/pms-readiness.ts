/** Operational claims are separate from the provider's external API access.
 * Docs checked 2026-10-05. No planned connector is advertised as operational.
 */
export interface PmsReadiness {
  implementation: "adapter_implemented" | "not_implemented";
  externalAccess: "credentials_required" | "partnership_required";
  verifiedNetwork: false;
  documentation: string;
  authorization: string;
  fallback: readonly ["pasted-text", "generic-web"];
}
const planned = (
  documentation: string,
  authorization: string,
  externalAccess: PmsReadiness["externalAccess"] = "credentials_required",
): PmsReadiness => ({
  implementation: "not_implemented",
  externalAccess,
  verifiedNetwork: false,
  documentation,
  authorization,
  fallback: ["pasted-text", "generic-web"],
});
export const PMS_READINESS: Record<string, PmsReadiness> = {
  guesty: {
    ...planned(
      "https://open-api-docs.guesty.com/docs/authentication",
      "OAuth client credentials; organization encryption key and customer Open API access required",
    ),
    implementation: "adapter_implemented",
  },
  lodgify: planned("https://docs.lodgify.com/reference", "Customer X-ApiKey with API access"),
  hostaway: planned(
    "https://api.hostaway.com/documentation",
    "OAuth client credentials: account ID and customer API secret",
  ),
  smoobu: planned(
    "https://docs.smoobu.com/",
    "HMAC API key + secret; multi-user OAuth requires partner registration",
  ),
  beds24: planned(
    "https://wiki.beds24.com/index.php/API_V2",
    "Scoped invite code exchanged for refresh/access tokens",
  ),
  amenitiz: planned(
    "https://support.amenitiz.com/en/articles/805686-how-to-understand-the-amenitiz-api",
    "Advanced plan beta: owner-created Client ID and secret; availability must be confirmed",
  ),
  cloudbeds: planned(
    "https://developers.cloudbeds.com/docs/getting-started-as-a-partner-in-5-steps",
    "Partner developer account and certification; property API-key access depends on account",
    "partnership_required",
  ),
  mews: planned(
    "https://docs.mews.com/connector-api/getting-started",
    "ClientToken for integration and AccessToken per enterprise; sandbox/partner access required",
    "partnership_required",
  ),
};
