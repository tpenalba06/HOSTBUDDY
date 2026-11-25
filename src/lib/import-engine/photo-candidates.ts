import { htmlText, lodgingDom, type HtmlNode } from "./lodging-dom";
import { privateAddress } from "./safe-public-fetch";
import type { LodgingPhoto, PhotoRole } from "./photo-roles";

const rolePatterns = {
  bedrooms: /bedroom|chambre|schlafzimmer|dormitorio|camera da letto|quarto/i,
  kitchen: /kitchen|cuisine|küche|cocina|cucina|cozinha/i,
  living: /living room|salon|wohnzimmer|sala de estar|soggiorno/i,
  pool: /pool(?!\s+table)|piscine|piscina|schwimmbad/i,
  outdoors:
    /outside|outdoor|extérieur|garden|jardin|garten|terrace|terrasse|terraza|terrazza|terraço/i,
  bathroom: /bathroom|salle de bain|badezimmer|baño|bagno|banheiro/i,
};
const decoration =
  /(?:^|[^\p{L}])(?:logo|avatar|favicon|icon|icone|icône|badge|placeholder|sprite|profile|advert|banner)(?:$|[^\p{L}])/iu;
const galleryPattern =
  /(?:^|[^a-z])(?:gallery|galerie|galeria|galería|galleria|carousel|slideshow|property-photos|listing-photos)(?:$|[^a-z])/i;

export function lodgingPhotoCandidates(
  page: ReturnType<typeof lodgingDom>,
  source: string,
): LodgingPhoto[] {
  const found = new Map<string, LodgingPhoto>();
  const add = (value: unknown, label = "", cover = false, knownOnly = false) => {
    if (typeof value !== "string" || !value.trim() || value.length > 2000) return;
    try {
      const url = new URL(value, source);
      if (
        url.protocol !== "https:" ||
        url.port ||
        url.username ||
        url.password ||
        privateAddress(url.hostname) ||
        /\.(?:svg|gif|ico)(?:$|\/)/i.test(url.pathname) ||
        /(?:^|\/)airbnb-platform-assets(?:\/|$)/i.test(url.pathname) ||
        decoration.test(url.pathname) ||
        decoration.test(label)
      )
        return;
      url.hash = "";
      const dedupe = new URL(url.href);
      for (const key of [
        "w",
        "h",
        "width",
        "height",
        "quality",
        "q",
        "fit",
        "format",
        "auto",
        "dpr",
        "im_w",
        "im_h",
      ])
        dedupe.searchParams.delete(key);
      dedupe.searchParams.sort();
      const cleanLabel = label.trim().slice(0, 180);
      const category = (Object.keys(rolePatterns) as (keyof typeof rolePatterns)[]).find((key) =>
        rolePatterns[key].test(cleanLabel),
      );
      const role = cover ? "cover" : (category ?? "equipment");
      const previous = found.get(dedupe.href);
      if (knownOnly && !previous) return;
      if (
        !previous ||
        cover ||
        (role !== "equipment" && previous.role === "equipment") ||
        (!previous.label && cleanLabel)
      )
        found.set(dedupe.href, {
          url: cover ? url.href : (previous?.url ?? url.href),
          role: previous?.role === "cover" ? "cover" : role,
          label: cleanLabel || previous?.label || "",
        });
    } catch {
      /* malformed or unsupported relative URL */
    }
  };
  for (const record of page.lodging) {
    const images = Array.isArray(record["image"])
      ? record["image"].slice(0, 60)
      : [record["image"]];
    for (const image of images) {
      if (typeof image === "string") add(image);
      else if (image && typeof image === "object") {
        const info = image as Record<string, unknown>;
        const label = info["caption"] ?? info["description"] ?? info["name"];
        add(info["contentUrl"] ?? info["url"], typeof label === "string" ? label : "");
      }
    }
  }
  const visit = (node: HtmlNode, gallery = false, context = "", sourceSet = "") => {
    if ("tagName" in node) {
      const attr = (name: string) => node.attrs.find((a) => a.name === name)?.value;
      if (
        ["nav", "footer", "header", "aside", "script"].includes(node.tagName) ||
        attr("hidden") !== undefined ||
        attr("aria-hidden") === "true" ||
        /review|testimonial|avatar|advert|cookie/i.test([attr("class"), attr("id")].join(" "))
      )
        return;
      const markers = [attr("id"), attr("class"), attr("aria-label"), attr("data-testid")].join(
        " ",
      );
      gallery ||= galleryPattern.test(markers) || attr("itemprop") === "photo";
      if (gallery && attr("aria-label") && !galleryPattern.test(attr("aria-label")!))
        context = attr("aria-label")!;
      if (node.tagName === "figure") {
        const caption = node.childNodes.find(
          (child) => "tagName" in child && child.tagName === "figcaption",
        );
        if (caption) context = htmlText(caption);
      }
      if (node.tagName === "picture") {
        const source = node.childNodes.find(
          (child) =>
            "tagName" in child &&
            child.tagName === "source" &&
            !child.attrs.some((a) => a.name === "media"),
        );
        if (source && "attrs" in source)
          sourceSet = source.attrs.find((a) => a.name === "srcset")?.value ?? "";
      }
      if (node.tagName === "img") {
        if (
          [attr("width"), attr("height")].some((value) => Number(value) > 0 && Number(value) < 160)
        )
          return;
        const srcset = attr("srcset") ?? attr("data-srcset") ?? sourceSet;
        const largest = srcset
          .split(",")
          .map((entry) => entry.trim().match(/^(\S+)\s+(\d+(?:\.\d+)?)[wx]$/))
          .filter((match) => match !== null)
          .sort((a, b) => Number(b[2]) - Number(a[2]))[0]?.[1];
        add(
          largest ?? attr("data-src") ?? attr("src"),
          [attr("alt"), context].filter(Boolean).join(" "),
          false,
          !gallery && attr("itemprop") !== "image",
        );
      }
    }
    if ("childNodes" in node)
      node.childNodes.forEach((child) => visit(child, gallery, context, sourceSet));
  };
  visit(page.document);
  add(
    page.metadata.get("og:image") ?? page.metadata.get("og:image:secure_url"),
    page.metadata.get("og:image:alt"),
    true,
    found.size > 0,
  );
  const photos = [...found.values()];
  const cover = photos.findIndex((photo) => photo.role === "cover");
  if (cover >= 0) photos.unshift(photos.splice(cover, 1)[0]!);
  else if (photos[0]) photos[0] = { ...photos[0], role: "cover" };
  return photos.slice(0, 30);
}

export function propertyPhotoCandidates(html: string, source: string): string[] {
  return lodgingPhotoCandidates(lodgingDom(html), source).map((photo) => photo.url);
}
