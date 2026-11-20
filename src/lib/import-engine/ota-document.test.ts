import { it, expect } from "vitest";
import { otaDocument } from "./ota-document";
import { previewPastedDocument } from "./public-preview";

it("keeps property facts and discards reviews and booking widgets (synthetic)", () => {
  const document = otaDocument(
    "# Studio TEST\n## Logement entier : appartement - Nice, France\n2 voyageurs\nCuisine équipée.\n## Sélectionnez la date d'arrivée\n25Départ uniquement\n## 4,8 étoiles commentaires\nLa piscine du voisin est jolie.\n## À savoir\nArrivée à partir de 16:00\nDépart avant 11:00",
    "https://www.airbnb.fr/rooms/1086157072408105944",
    {},
  );
  expect(document.location).toBe("Nice, France");
  expect(document.text).not.toContain("piscine du voisin");
  expect(document.text).not.toContain("25Départ");
  const preview = previewPastedDocument(document.text, document.title);
  expect(preview.capacity).toBe(2);
  expect(preview.arrival).toBe("16:00");
  expect(preview.departure).toBe("11:00");
  expect(preview.text?.kitchen).toContain("Cuisine équipée");
});

it("ends classified sections at real page headings (synthetic)", () => {
  const document = otaDocument(
    "Équipements\nNavigation factice\n# Studio TEST\n## Ce que propose ce logement\nLave-linge\n## Où se situe le logement\nNice, France\n## À savoir\nArrivée à partir de 16:00",
    "https://www.airbnb.fr/rooms/1086157072408105944",
    {},
  );
  const preview = previewPastedDocument(document.text, document.title);
  expect(preview.text?.equipment).toContain("Lave-linge");
  expect(preview.text?.equipment).not.toContain("Nice");
  expect(preview.text?.equipment).not.toContain("Navigation factice");
  expect(preview.text?.equipment).not.toContain("Arrivée");
});
