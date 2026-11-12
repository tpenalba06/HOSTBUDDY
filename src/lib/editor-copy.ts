import type { Locale } from "./i18n";
const keys = [
  "editor.videoTitle",
  "editor.videoHelp",
  "editor.sectionsOrder",
  "editor.moveSection",
  "editor.hidden",
  "editor.sectionActions",
  "editor.dragInstructions",
  "editor.position",
  "editor.dropped",
];
const copy: Record<Locale, string[]> = {
  fr: [
    "Vidéo de présentation",
    "Présentez le logement à vos voyageurs en quelques secondes.",
    "Ordre des sections",
    "Déplacer la section",
    "Masquée",
    "Actions de la section",
    "Appuyez sur Espace pour prendre une section, utilisez les flèches pour la déplacer, Espace pour la déposer ou Échap pour annuler.",
    "Position",
    "Section déplacée",
  ],
  en: [
    "Welcome video",
    "Introduce your property to your guests in a few seconds.",
    "Section order",
    "Move section",
    "Hidden",
    "Section actions",
    "Press Space to pick up a section, use arrow keys to move, Space to drop or Escape to cancel.",
    "Position",
    "Section moved",
  ],
  es: [
    "Vídeo de presentación",
    "Presente el alojamiento a sus huéspedes en unos segundos.",
    "Orden de las secciones",
    "Mover sección",
    "Oculta",
    "Acciones de la sección",
    "Pulse Espacio para recoger una sección, las flechas para moverla, Espacio para soltarla o Escape para cancelar.",
    "Posición",
    "Sección movida",
  ],
  de: [
    "Vorstellungsvideo",
    "Stellen Sie Ihren Gästen die Unterkunft in wenigen Sekunden vor.",
    "Reihenfolge der Abschnitte",
    "Abschnitt verschieben",
    "Ausgeblendet",
    "Abschnittaktionen",
    "Leertaste zum Aufnehmen, Pfeiltasten zum Verschieben, Leertaste zum Ablegen oder Escape zum Abbrechen.",
    "Position",
    "Abschnitt verschoben",
  ],
  it: [
    "Video di presentazione",
    "Presentate l’alloggio ai vostri ospiti in pochi secondi.",
    "Ordine delle sezioni",
    "Sposta sezione",
    "Nascosta",
    "Azioni della sezione",
    "Premi Spazio per prendere una sezione, le frecce per spostarla, Spazio per rilasciarla o Escape per annullare.",
    "Posizione",
    "Sezione spostata",
  ],
  pt: [
    "Vídeo de apresentação",
    "Apresente o alojamento aos seus hóspedes em poucos segundos.",
    "Ordem das secções",
    "Mover secção",
    "Oculta",
    "Ações da secção",
    "Prima Espaço para pegar numa secção, as setas para mover, Espaço para largar ou Escape para cancelar.",
    "Posição",
    "Secção movida",
  ],
};
export function addEditorCopy(translations: Record<Locale, Record<string, string>>) {
  for (const locale of Object.keys(copy) as Locale[])
    keys.forEach((key, index) => {
      translations[locale][key] = copy[locale][index]!;
    });
}
