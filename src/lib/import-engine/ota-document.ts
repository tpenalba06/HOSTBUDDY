/** Scope public page text to property content, excluding booking widgets,
 * reviews and platform navigation. No private API or script-state harvesting. */
export function otaDocument(markdown: string, source: string, metadata: Record<string, unknown>) {
  const airbnb = new URL(source).hostname.endsWith("airbnb.fr");
  const headings = markdown.split("\n");
  const title = headings
    .find((line) => /^# /.test(line))
    ?.replace(/^# /, "")
    .trim();
  let suppressed = false;
  const lines: string[] = [];
  for (const line of headings) {
    if (/^## /.test(line)) {
      suppressed =
        /Sélectionnez la date|commentaires|Disponibilité|Questions des voyageurs|Faites connaissance|^## (?:Laure|Améliorez|Imerovigli.*choses à faire)/i.test(
          line,
        );
    }
    if (!suppressed) lines.push(line);
  }
  const clean = lines
    .join("\n")
    .replace(/!\[[^\]]*\]\([^\n]*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^\n]*?\)/g, "$1")
    .replace(/\\/g, "")
    .replace(/^#{1,6}\s+/gm, "");
  const location = airbnb
    ? markdown.match(/^## Logement entier[^\n]*? - ([^\n]+)/m)?.[1]?.trim()
    : typeof metadata["title"] === "string" && title
      ? metadata["title"]
          .slice(title.length)
          .match(/^,\s*([^()]+?)(?:\s*\(|$)/)?.[1]
          ?.trim()
      : undefined;
  const description =
    metadata["ogDescription"] ?? metadata["og:description"] ?? metadata["description"];
  return {
    title,
    location,
    text: [typeof description === "string" ? `# Description\n${description}` : "", clean]
      .filter(Boolean)
      .join("\n"),
  };
}
