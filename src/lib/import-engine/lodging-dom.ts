import { parse, type DefaultTreeAdapterMap } from "parse5";

export type HtmlNode = DefaultTreeAdapterMap["node"];
export type HtmlElement = DefaultTreeAdapterMap["element"];
export type LodgingRecord = Record<string, unknown>;

export function htmlText(node: HtmlNode): string {
  if ("value" in node) return node.value;
  return "childNodes" in node ? node.childNodes.map(htmlText).join("") : "";
}

export function lodgingDom(html: string) {
  const document = parse(html);
  const metadata = new Map<string, string>();
  const lodging: LodgingRecord[] = [];
  let title = "";
  const records = (value: unknown, depth = 0) => {
    if (depth > 8 || lodging.length >= 30 || !value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.slice(0, 100).forEach((item) => records(item, depth + 1));
      return;
    }
    const item = value as LodgingRecord;
    const tags = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
    if (
      tags.some(
        (tag) =>
          typeof tag === "string" &&
          /^(?:(?:https?:\/\/schema\.org\/)?(?:LodgingBusiness|VacationRental|Accommodation|House|Apartment|Hotel|HotelRoom|Motel|Resort|BedAndBreakfast|Residence|SingleFamilyResidence|Hostel|Campground|Cabin))$/i.test(
            tag,
          ),
      )
    )
      lodging.push(item);
    for (const key of [
      "@graph",
      "mainEntity",
      "mainEntityOfPage",
      "property",
      "listing",
      "accommodation",
      "props",
      "pageProps",
    ])
      records(item[key], depth + 1);
  };
  const visit = (node: HtmlNode) => {
    if ("tagName" in node) {
      const attr = (name: string) => node.attrs.find((a) => a.name === name)?.value;
      if (node.tagName === "title" && !title) title = htmlText(node).trim();
      if (
        node.tagName === "link" &&
        attr("rel")?.toLowerCase().split(/\s+/).includes("canonical")
      ) {
        const canonical = attr("href");
        if (canonical && !metadata.has("canonical")) metadata.set("canonical", canonical);
      }
      if (node.tagName === "meta") {
        const key = (attr("property") ?? attr("name"))?.toLowerCase();
        const value = attr("content")?.trim();
        if (key && value && !metadata.has(key)) metadata.set(key, value);
      }
      if (
        node.tagName === "script" &&
        /^(?:application\/(?:ld\+)?json)(?:\s*;|$)/i.test(attr("type") ?? "")
      ) {
        const value = htmlText(node);
        if (value.length < 750_000) {
          try {
            records(JSON.parse(value));
          } catch {
            /* malformed JSON is not evidence */
          }
        }
      }
    }
    if ("childNodes" in node) node.childNodes.forEach(visit);
  };
  visit(document);
  return { document, metadata, lodging, title };
}
