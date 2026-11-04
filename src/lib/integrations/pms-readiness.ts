/** Operational claims are separate from the provider's external API access.
 * Docs checked 2026-10-18. Implementation never implies a live customer connection.
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
const sessionAdapter = (documentation: string, authorization: string): PmsReadiness => ({
  ...planned(documentation, authorization),
  implementation: "adapter_implemented",
});
export const PMS_READINESS: Record<string, PmsReadiness> = {
  guesty: {
    ...planned(
      "https://open-api-docs.guesty.com/docs/authentication",
      "OAuth client credentials; organization encryption key and customer Open API access required",
    ),
    implementation: "adapter_implemented",
  },
  lodgify: sessionAdapter(
    "https://docs.lodgify.com/reference",
    "Customer X-ApiKey with API access; live response contract remains unverified",
  ),
  hostaway: sessionAdapter(
    "https://api.hostaway.com/documentation",
    "Existing customer bearer access token; acquisition/refresh not implemented by session adapter",
  ),
  smoobu: sessionAdapter(
    "https://docs.smoobu.com/",
    "HMAC API key + secret; multi-user OAuth requires partner registration",
  ),
  beds24: sessionAdapter(
    "https://wiki.beds24.com/index.php/API_V2",
    "Existing scoped long-life read-only token; invite exchange not implemented by session adapter",
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
