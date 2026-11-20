/** Scope public page text to property content, excluding booking widgets,
 * reviews and platform navigation. No private API or script-state harvesting. */
export function otaDocument(markdown: string, source: string, metadata: Record<string, unknown>) {
  const airbnb = new URL(source).hostname.endsWith("airbnb.fr");
  const allLines = markdown.split("\n");
  const firstTitle = allLines.findIndex((line) => /^# /.test(line));
  const headings = firstTitle >= 0 ? allLines.slice(firstTitle) : allLines;
  const title = headings
    .find((line) => /^# /.test(line))
    ?.replace(/^# /, "")
    .trim();
  let suppressed = false;
  let generatedHighlights = false;
  const lines: string[] = [];
  for (const line of headings) {
    if (airbnb && /^## Mise en avant/.test(line)) {
      generatedHighlights = true;
      continue;
    }
    if (generatedHighlights && /Ces résumés ont été générés/.test(line)) {
      generatedHighlights = false;
      lines.push("## Description");
      continue;
    }
    if (generatedHighlights && !/^## /.test(line)) continue;
    if (/^## /.test(line)) generatedHighlights = false;
    if (
      /^(?:En savoir plus sur les résumés|Afficher les \d+ équipements|Commentaires|Emplacement|Équipements)\s*$/.test(
        line.trim(),
      )
    )
      continue;
    if (/^## /.test(line)) {
      suppressed =
        /Sélectionnez la date|commentaires|Disponibilité|Questions des voyageurs|Faites connaissance|^## (?:Améliorez|.*choses à faire)/i.test(
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
    .replace(/^## Ce que propose ce logement\s*$/gm, "## Équipements")
    .replace(/^(?:\*\*)?(?:Le logement|Autres remarques)(?:\*\*)?\s*$/gm, "## Description");
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
