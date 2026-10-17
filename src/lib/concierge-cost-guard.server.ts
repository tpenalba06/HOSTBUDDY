export const MAX_GATEWAY_BODY_BYTES = 24576;

type PriceModel = {
  id?: string;
  no_training?: string;
  zdr?: string;
  pricing?: Record<string, unknown>;
};

// A catalogue gate, not by itself a proof of the EUR billing envelope.
// Every tier and region is inspected; malformed or unknown pricing fails closed.
export function conciergeCatalogueAllowed(model: PriceModel | undefined): boolean {
  if (
    model?.id !== "anthropic/claude-haiku-5.5" ||
    model.no_training !== "all" ||
    model.zdr !== "all" ||
    !model.pricing
  )
    return false;
  const validRate = (value: unknown, ceiling: number) =>
    (typeof value === "string" || typeof value === "number") &&
    String(value).trim() !== "" &&
    Number.isFinite(Number(value)) &&
    Number(value) >= 0 &&
    Number(value) <= ceiling;
  const inspect = (pricing: Record<string, unknown>, regional = false): boolean => {
    if (
      !validRate(pricing["input"], regional ? 0.00000011 : 0.0000001) ||
      !validRate(pricing["output"], regional ? 0.00000055 : 0.0000005) ||
      pricing["varies_by_provider"] === true
    )
      return false;
    for (const [key, value] of Object.entries(pricing)) {
      if (key === "regional") {
        if (
          !value ||
          typeof value !== "object" ||
          Array.isArray(value) ||
          !Object.values(value).every(
            (region) =>
              region &&
              typeof region === "object" &&
              !Array.isArray(region) &&
              inspect(region as Record<string, unknown>, true),
          )
        )
          return false;
      } else if (key.endsWith("_tiers")) {
        const ceiling = key.startsWith("output")
          ? 0.00000275
          : key.startsWith("input_cache_write")
            ? 0.0000006875
            : key.startsWith("input_cache_read")
              ? 0.000000055
              : key.startsWith("input")
                ? 0.00000055
                : null;
        if (
          ceiling === null ||
          !Array.isArray(value) ||
          !value.length ||
          !value.every(
            (tier) =>
              tier &&
              typeof tier === "object" &&
              validRate(tier.cost, ceiling) &&
              typeof tier.min === "number" &&
              Number.isFinite(tier.min) &&
              tier.min >= 0 &&
              (tier.max === undefined ||
                (typeof tier.max === "number" && Number.isFinite(tier.max) && tier.max > tier.min)),
          )
        )
          return false;
      } else if (key === "input_cache_read" || key === "input_cache_write") {
        if (!validRate(value, key === "input_cache_read" ? 0.000000055 : 0.0000006875))
          return false;
      } else if (!["input", "output", "web_search", "varies_by_provider"].includes(key)) {
        return false;
      }
    }
    return true;
  };
  return inspect(model.pricing);
}

export function assertConciergeWireRequest(url: string | URL | Request, init?: RequestInit) {
  const destination = new URL(typeof url === "string" || url instanceof URL ? url : url.url);
  if (
    destination.origin !== "https://ai-gateway.vercel.sh" ||
    init?.method !== "POST" ||
    typeof init.body !== "string" ||
    Buffer.byteLength(init.body, "utf8") > MAX_GATEWAY_BODY_BYTES
  )
    throw new Error("concierge-wire-blocked");
  const body = JSON.parse(init.body);
  if (
    !Number.isInteger(body.maxOutputTokens) ||
    body.maxOutputTokens < 1 ||
    body.maxOutputTokens > 800 ||
    (body.tools !== undefined && (!Array.isArray(body.tools) || body.tools.length > 0)) ||
    !Array.isArray(body.providerOptions?.gateway?.only) ||
    body.providerOptions.gateway.only.length !== 1 ||
    body.providerOptions.gateway.only[0] !== "anthropic" ||
    (body.providerOptions.gateway.models !== undefined &&
      (!Array.isArray(body.providerOptions.gateway.models) ||
        body.providerOptions.gateway.models.length > 0)) ||
    body.providerOptions.gateway.zeroDataRetention !== true ||
    body.providerOptions.gateway.disallowPromptTraining !== true ||
    body.providerOptions?.anthropic?.thinking?.type !== "disabled"
  )
    throw new Error("concierge-wire-blocked");
}
