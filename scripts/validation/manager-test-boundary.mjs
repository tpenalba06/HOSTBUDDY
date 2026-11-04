export const TEST_BACKEND = "https://mhhtnqfdkyudwyqlmnce.supabase.co";
export const TEST_PROJECT = "prj_JNddG5i5NkQyvQI83Blh7X02GVzV";

/** Dedicated validation deployment only. Never imported by the product build. */
export function prepareManagerTestEnvironment(env, publishableKey) {
  if (
    env.VERCEL_ENV !== "preview" ||
    (env.VERCEL_PROJECT_ID && env.VERCEL_PROJECT_ID !== TEST_PROJECT) ||
    env.SUPABASE_URL !== TEST_BACKEND ||
    !publishableKey ||
    /^(?:sb_secret_|sk_|rk_)/.test(publishableKey)
  )
    return false;
  for (const name of Object.keys(env)) {
    if (/STRIPE|OLLAMA|AI_GATEWAY|VERCEL_OIDC_TOKEN/.test(name)) delete env[name];
  }
  env.SUPABASE_PUBLISHABLE_KEY = publishableKey;
  env.NONA_CLOUD_SCOPE = "test";
  env.NONA_OLLAMA_TEST_ENABLE = "closed-manager-validation";
  env.NONA_OLLAMA_PREVIEW_ENABLE = "closed-manager-validation";
  return true;
}

export function managerTestBoundary(handler, ready) {
  return (req, res) => {
    res.setHeader("x-robots-tag", "noindex, nofollow");
    res.setHeader("referrer-policy", "no-referrer");
    if (!ready) {
      res.statusCode = 503;
      return res.end("TEST unavailable");
    }
    const path = new URL(req.url, "https://test.invalid").pathname;
    if (
      /^\/api\/(?:stripe|billing|webhooks)(?:\/|$)/i.test(path) ||
      (/^\/api\/public(?:\/|$)/i.test(path) && !["GET", "HEAD"].includes(req.method))
    ) {
      res.statusCode = 405;
      return res.end("Unavailable in manager TEST validation");
    }
    return handler(req, res);
  };
}
