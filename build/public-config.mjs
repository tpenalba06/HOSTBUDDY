/** Fail before Vite can inline misconfigured private keys into client assets. */
export function assertPublicEnvironment(env) {
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith("VITE_") || !value) continue;
    if (
      /(?:SECRET|PASSWORD|PRIVATE|SERVICE_ROLE)/i.test(name) ||
      /^(?:sb_secret_|(?:sk|rk)_(?:test|live)_|whsec_)/.test(value)
    )
      throw new Error("unsafe_frontend_configuration");
    if (value.startsWith("eyJ")) {
      let role;
      try {
        role = JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString()).role;
      } catch {
        /* Not a JWT. */
      }
      if (role === "service_role") throw new Error("unsafe_frontend_configuration");
    }
  }
}
