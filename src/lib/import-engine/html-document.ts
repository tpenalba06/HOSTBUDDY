import { parse, type DefaultTreeAdapterMap } from "parse5";
import { readFlightRecords } from "./flight-records";

type Node = DefaultTreeAdapterMap["node"];
const skipped = new Set(["script", "style", "svg", "noscript", "nav", "form"]);
const block = new Set(["p", "div", "li", "section", "article", "footer", "br", "tr"]);

/** Parse HTML as data, never execute page scripts or fetch their dependencies. */
export function htmlDocumentText(html: string): string {
  const parts: string[] = [];
  function visit(node: Node) {
    if (node.nodeName === "#text" && "value" in node) {
      parts.push(node.value);
      return;
    }
    if ("tagName" in node) {
      if (
        skipped.has(node.tagName) ||
        node.attrs.some(
          (a) =>
            (a.name === "aria-hidden" && a.value === "true") ||
            (["id", "class"].includes(a.name) &&
              /(?:^|[ _-])(?:reviews?|testimonials?|cookie-banner|trustindex)(?:$|[ _-])/i.test(
                a.value,
              )),
        )
      )
        return;
      if (/^h[1-6]$/.test(node.tagName)) parts.push("\n# ");
      else if (block.has(node.tagName)) parts.push("\n");
    }
    if ("childNodes" in node) node.childNodes.forEach(visit);
    if ("tagName" in node && (block.has(node.tagName) || /^h[1-6]$/.test(node.tagName)))
      parts.push("\n");
  }
  visit(parse(html));
  return parts
    .join("")
    .replace(/[\t ]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

/** Only the matching public establishment's documented guest content is read.
 * Do not recursively harvest arbitrary script strings, UI translations or tokens. */
export function sunverGuestDocument(
  html: string,
  source: string,
): { text: string; photos: string[]; recommendations: string } | null {
  const url = new URL(source);
  if (url.hostname !== "app.sunver.app" || !/^\/[a-z]{2}\/guest\/[^/]+\/?$/.test(url.pathname))
    return null;
  const slug = url.pathname.split("/").filter(Boolean).at(-1);
  const records = readFlightRecords(html);
  const publicContent: Record<string, unknown>[] = [];
  let establishment: Record<string, unknown> | undefined;
  let visited = 0;
  function find(value: unknown, depth = 0) {
    if (!value || typeof value !== "object" || depth > 24 || ++visited > 25_000) return;
    const object = value as Record<string, unknown>;
    if (Array.isArray(object["faqQuestions"]) || Array.isArray(object["moduleCategories"]))
      publicContent.push(object);
    const e = object["establishment"];
    if (e && typeof e === "object") {
      const candidate = e as Record<string, unknown>;
      if (candidate["slug"] === slug && candidate["disabled"] !== true && !candidate["deleted_at"])
        establishment = candidate;
    }
    for (const [key, item] of Object.entries(object))
      if (!["messages", "user", "integrations", "config", "token"].includes(key))
        find(item, depth + 1);
  }
  for (const value of records.values()) find(value);
  if (!establishment) return null;
  const e = establishment as Record<string, unknown>;
  const locale = url.pathname.split("/")[1] ?? "fr";
  const localizedText = (input: unknown, depth = 0): string => {
    if (depth > 4) return "";
    let value = input;
    if (typeof value === "string" && /^\$[\da-f]+$/i.test(value))
      value = records.get(value.slice(1));
    if (typeof value === "string") return value;
    if (!value || typeof value !== "object" || Array.isArray(value)) return "";
    const localized = value as Record<string, unknown>;
    const selected = localized[locale] ?? localized["fr"] ?? localized["en"];
    return typeof selected === "string" ? localizedText(selected, depth + 1) : "";
  };
  const string = (key: string) => localizedText(e[key]);
  const lines = [
    `Nom du logement : ${string("name")}`,
    string("info_text") ? `# Description\n${htmlDocumentText(string("info_text"))}` : "",
    string("address")
      ? `Adresse : ${[string("address"), string("zipcode"), string("city"), string("country")].filter(Boolean).join(", ")}`
      : "",
    string("phone_number") ? `Téléphone : ${string("phone_number")}` : "",
    string("mail") ? `E-mail : ${string("mail")}` : "",
    string("wifi_ssid") ? `Réseau Wi-Fi : ${string("wifi_ssid")}` : "",
    string("wifi_password") ? `Mot de passe Wi-Fi : ${string("wifi_password")}` : "",
  ].filter(Boolean);
  let picture = e["main_picture"];
  if (picture && typeof picture === "object") picture = (picture as Record<string, unknown>)["url"];
  const photos = typeof picture === "string" && /^https:\/\//.test(picture) ? [picture] : [];
  const recommendations: string[] = [];
  for (const content of publicContent) {
    const entries = (v: unknown) =>
      Array.isArray(v)
        ? v.filter((r): r is Record<string, unknown> => Boolean(r && typeof r === "object"))
        : [];
    for (const faq of entries(content["faqQuestions"])) {
      if (faq["establishment_id"] !== e["id"]) continue;
      lines.push(
        `${localizedText(faq["question"])}\n${htmlDocumentText(localizedText(faq["answer"]))}`,
      );
    }
    const moduleIds = new Set<string>();
    for (const category of entries(content["moduleCategories"])) {
      if (category["establishment_id"] !== e["id"]) continue;
      for (const module of entries(category["modules"])) {
        if (module["visibility"] !== "PUBLIC" || module["enable_time_window"] === true) continue;
        if (typeof module["id"] === "string") moduleIds.add(module["id"]);
        if (["DEFAULT", "TEXT_MAIN_PAGE"].includes(String(module["type"]))) {
          const pictures = Array.isArray(module["pictures"]) ? module["pictures"] : [];
          for (const picture of pictures)
            if (typeof picture === "string" && /^https:\/\//.test(picture)) photos.push(picture);
        }
      }
    }
    for (const description of entries(content["optionalModuleDescriptions"])) {
      if (typeof description["id"] === "string" && moduleIds.has(description["id"]))
        lines.push(htmlDocumentText(localizedText(description["description"])));
    }
    for (const category of entries(content["alentours"])) {
      if (category["establishment_id"] !== e["id"]) continue;
      for (const place of entries(category["alentours"])) {
        if (place["establishment_id"] !== e["id"]) continue;
        recommendations.push(
          [
            localizedText(place["name"]),
            localizedText(place["address"]),
            htmlDocumentText(localizedText(place["comment"])),
          ]
            .filter(Boolean)
            .join(" — "),
        );
      }
    }
  }
  return {
    text: lines.join("\n"),
    photos: [...new Set(photos)].slice(0, 30),
    recommendations: [...new Set(recommendations)].join("\n"),
  };
}
