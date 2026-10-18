import type { Locale } from "./i18n";

export const qrCopy: Record<Locale, Record<string, string>> = {
  fr: {
    "qr.alt": "QR code du livret",
    "qr.failed": "Le QR code n’a pas pu être créé. Fermez puis rouvrez cet aperçu.",
    "qr.printFailed":
      "Votre navigateur a bloqué l’impression. Autorisez les fenêtres pour HostBuddy ou téléchargez le PNG.",
  },
  en: {
    "qr.alt": "Guide QR code for",
    "qr.failed": "The QR code could not be created. Close and reopen this preview.",
    "qr.printFailed":
      "Your browser blocked printing. Allow popups for HostBuddy or download the PNG.",
  },
  es: {
    "qr.alt": "Código QR de la guía",
    "qr.failed": "No se pudo crear el código QR. Cierra y vuelve a abrir esta vista previa.",
    "qr.printFailed":
      "Tu navegador bloqueó la impresión. Permite ventanas emergentes de HostBuddy o descarga el PNG.",
  },
  de: {
    "qr.alt": "QR-Code des Gästeführers",
    "qr.failed":
      "Der QR-Code konnte nicht erstellt werden. Schließe diese Vorschau und öffne sie erneut.",
    "qr.printFailed":
      "Dein Browser hat das Drucken blockiert. Erlaube Pop-ups für HostBuddy oder lade die PNG-Datei herunter.",
  },
  it: {
    "qr.alt": "Codice QR della guida",
    "qr.failed": "Impossibile creare il codice QR. Chiudi e riapri questa anteprima.",
    "qr.printFailed":
      "Il browser ha bloccato la stampa. Consenti i popup per HostBuddy o scarica il PNG.",
  },
  pt: {
    "qr.alt": "Código QR do guia",
    "qr.failed": "Não foi possível criar o código QR. Fecha e volta a abrir esta pré-visualização.",
    "qr.printFailed":
      "O navegador bloqueou a impressão. Permite janelas pop-up para o HostBuddy ou descarrega o PNG.",
  },
};

export function addQrCopy(translations: Record<Locale, Record<string, string>>) {
  for (const locale of Object.keys(qrCopy) as Locale[])
    Object.assign(translations[locale], qrCopy[locale]);
}
