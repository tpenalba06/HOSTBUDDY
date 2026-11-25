const propertyHeading =
  /^#\s+(?:(?:logement|chambre)\b|(?:entire|private room|room in)\b|gesamte?\b|alojamiento entero\b|habitación\b|intero alloggio\b|stanza\b|espaço inteiro\b|quarto\b)/iu;
const equipmentHeading =
  /^#\s+(?:ce que propose ce logement|what this place offers|was diese unterkunft bietet|qué ofrece este lugar|cosa troverai|o que este espaço oferece)$/iu;
const guestCount = /^([1-9]\d?)\s+(?:voyageurs?|guests?|gäste|huéspedes|ospiti|hóspedes)$/iu;
const equipmentEnd =
  /^(?:#|afficher|voir les|show all|see all|alle .*anzeigen|mostrar|ver todos|mostra)/iu;
const unavailable =
  /^(?:indisponible|non disponible|unavailable|not available|nicht verfügbar|no disponible|non disponibile|indisponível)\b/iu;

/** Read the opt-in facts displayed in the public listing, away from the booking form. */
export function airbnbVisibleFacts(document: string) {
  const lines = document.split("\n").map((line) => line.replace(/\s+/gu, " ").trim());
  const overview = lines.findIndex((line) => propertyHeading.test(line));
  const guests =
    overview < 0
      ? undefined
      : lines
          .slice(overview + 1, overview + 6)
          .flatMap((line) => line.split(/\s*[·•]\s*/u))
          .map((part) => part.match(guestCount))
          .find(Boolean)?.[1];
  const start = lines.findIndex((line) => equipmentHeading.test(line));
  const amenities: string[] = [];
  if (start >= 0) {
    for (const line of lines.slice(start + 1, start + 35)) {
      if (equipmentEnd.test(line)) break;
      if (line && line.length <= 120 && !unavailable.test(line)) amenities.push(line);
    }
  }
  return { guests, amenities: [...new Set(amenities)] };
}
