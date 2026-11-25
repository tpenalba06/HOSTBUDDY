// Exact registrable domains. Identifiers are recognized by format, never by list.
const airbnbDomains = new Set(
  "com fr de es it pt co.uk ca com.au co.nz ie at be ch nl dk no se fi gr pl cz hu ro com.br mx com.mx co.in co.kr jp com.sg com.hk com.tw ae com.tr cl com.co com.ar".split(
    " ",
  ),
);

export function otaListing(input: string) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.port || url.username || url.password) return null;
  const host = url.hostname.replace(/^www\./, "");
  const airbnb = host.startsWith("airbnb.") && airbnbDomains.has(host.slice(7));
  const booking = host === "booking.com" || host === "m.booking.com";
  const path = url.pathname.replace(/\/$/, "");
  if (airbnb && /^\/rooms\/[1-9]\d{0,29}$/.test(path))
    return { platform: "airbnb", url: `https://www.${host}${path}` } as const;
  if (booking && /^\/hotel\/[a-z]{2}\/[a-z0-9][a-z0-9._-]{0,249}\.html$/i.test(path))
    return { platform: "booking", url: `https://www.booking.com${path}` } as const;
  return null;
}

export function otaPlatformHost(host: string) {
  return /(^|\.)airbnb\./i.test(host) || /(^|\.)booking\.com$/i.test(host);
}
