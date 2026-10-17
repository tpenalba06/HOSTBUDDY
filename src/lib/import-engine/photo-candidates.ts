/** Only property-declared image metadata; never harvest arbitrary page/UI images. */
export function propertyPhotoCandidates(html: string, source: string): string[] {
  const raw: string[] = [];
  const push = (value: unknown) => {
    if (typeof value === "string") raw.push(value);
    else if (Array.isArray(value)) value.forEach(push);
    else if (value && typeof value === "object") {
      const item = value as Record<string, unknown>;
      push(item["url"] ?? item["contentUrl"]);
    }
  };
  for (const match of html.matchAll(
    /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const parsed: unknown = JSON.parse(match[1]!);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const value of nodes) {
        if (!value || typeof value !== "object") continue;
        const node = value as Record<string, unknown>;
        const all = Array.isArray(node["@graph"]) ? [node, ...node["@graph"]] : [node];
        for (const value of all) {
          if (!value || typeof value !== "object") continue;
          const item = value as Record<string, unknown>;
          if (
            /Lodging|VacationRental|Accommodation|House|Apartment|Hotel|Residence|Place/i.test(
              String(item["@type"]),
            )
          )
            push(item["image"]);
        }
      }
    } catch {
      /* malformed source metadata */
    }
  }
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const name = tag[0].match(/(?:property|name)=["']([^"']+)["']/i)?.[1];
    if (name === "og:image") push(tag[0].match(/content=["']([^"']+)["']/i)?.[1]);
  }
  return [
    ...new Set(
      raw.flatMap((value) => {
        try {
          const url = new URL(value.replace(/&amp;/g, "&"), source);
          return url.protocol === "https:" && !url.username && !url.password ? [url.href] : [];
        } catch {
          return [];
        }
      }),
    ),
  ].slice(0, 8);
}
