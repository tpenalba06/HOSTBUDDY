/** Scope public page text to property content, excluding booking widgets,
 * reviews and platform navigation. No private API or script-state harvesting. */
export function otaDocument(markdown: string, source: string, metadata: Record<string, unknown>) {
  const airbnb = new URL(source).hostname.startsWith("www.airbnb.");
  const equipmentHeading =
    /^(?:Ce que propose ce logement|Équipements de l'établissement|What this place offers|Facilities of|Was diese Unterkunft bietet|Ausstattung von|Qué ofrece este lugar|Servicios de|Cosa troverai|Servizi di|O que este espaço oferece|Comodidades d)/iu;
  const propertyHeading =
    /^(?:Environs de l'établissement|Règles de la maison|À savoir|Property surroundings|House rules|The fine print|Umgebung|Hausregeln|Kleingedrucktes|Alrededores|Normas de la casa|A tener en cuenta|Dintorni|Regole della casa|Da sapere|Proximidades|Regras da casa|Pormenores)/iu;
  const allLines = markdown.split("\n");
  const navigationTitle =
    /^# (?:Aller directement|Passer au|Skip to|Airbnb$|Booking\.com$|Menu$|Connexion$)/i;
  const firstTitle = allLines.findIndex((line) => /^# /.test(line) && !navigationTitle.test(line));
  const headings = firstTitle >= 0 ? allLines.slice(firstTitle) : allLines;
  const bodyTitle = headings
    .find((line) => /^# /.test(line))
    ?.replace(/^# /, "")
    .trim();
  const ogTitle = metadata["ogTitle"] ?? metadata["og:title"];
  const title =
    bodyTitle && !navigationTitle.test(`# ${bodyTitle}`)
      ? bodyTitle
      : typeof ogTitle === "string" && !navigationTitle.test(`# ${ogTitle}`)
        ? ogTitle
            .replace(/ - (?:Appartements?|Maisons?|Villas?|Chambres?|Logements?).* - Airbnb$/, "")
            .trim()
        : undefined;
  let suppressed = false;
  let generatedHighlights = false;
  let bookingPropertySection = false;
  const lines: string[] = [];
  for (const line of headings) {
    if (!airbnb) {
      if (/^## /.test(line))
        bookingPropertySection =
          equipmentHeading.test(line.slice(3)) || propertyHeading.test(line.slice(3));
      if (!bookingPropertySection) continue;
    }
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
        /Sélectionnez la date|commentaires|Disponibilité|Questions des voyageurs|Faites connaissance|^## (?:Améliorez|.*choses à faire|Select check-in|Reviews|Availability|Meet your host|Bewertungen|Valoraciones|Recensioni|Avaliações)/i.test(
          line,
        );
    }
    if (!suppressed)
      lines.push(
        /^## /.test(line) && equipmentHeading.test(line.slice(3)) ? "## Équipements" : line,
      );
  }
  const clean = lines
    .join("\n")
    .replace(/!\[[^\]]*\]\([^\n]*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^\n]*?\)/g, "$1")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/\\/g, "")
    .replace(/^## Ce que propose ce logement\s*$/gm, "## Équipements")
    .replace(/^(?:\*\*)?(?:Le logement|Autres remarques)(?:\*\*)?\s*$/gm, "## Description");
  const location = airbnb
    ? markdown
        .match(
          /^## (?:Logement entier|Entire |Gesamte |Alojamiento entero|Intero |Espaço inteiro)[^\n]*? [–-] ([^\n]+)/im,
        )?.[1]
        ?.trim()
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
