import type { Locale } from "../i18n";
import { translateStatic } from "../i18n";

const sourceGroups = [
  ["Choisissez une image JPG, PNG, WebP ou AVIF de moins de 10 Mo."],
  ["Choisissez une vidéo MP4 ou WebM de moins de 50 Mo."],
  [
    "Cette vidéo ne peut pas être lue. Choisissez un autre fichier.",
    "Cette vidéo ne peut pas être lue.",
    "La vidéo ne peut pas être lue. Choisissez un autre fichier.",
    "Cette vidéo ne peut pas être lue par le navigateur.",
  ],
  ["La vidéo de présentation doit durer au maximum 90 secondes."],
  ["Une vidéo est déjà en préparation. Attendez sa fin."],
  [
    "Le moteur vidéo n’a pas pu être chargé. Réessayez.",
    "Le moteur vidéo n’a pas pu être chargé. Vérifiez votre connexion puis réessayez.",
  ],
  ["La préparation vidéo a échoué. Essayez une vidéo plus courte."],
  ["La vidéo reste trop volumineuse. Essayez une vidéo plus courte."],
  [
    "Préparation annulée. Votre vidéo précédente est conservée.",
    "Envoi annulé. Votre média précédent est conservé.",
  ],
  ["La préparation a pris trop de temps. Essayez une vidéo plus courte."],
] as const;
const messages: Record<Locale, readonly string[]> = {
  fr: sourceGroups.map((group) => group[0]),
  en: [
    "Choose a JPG, PNG, WebP or AVIF image smaller than 10 MB.",
    "Choose an MP4 or WebM video smaller than 50 MB.",
    "This video cannot be played. Choose another file.",
    "The presentation video must be no longer than 90 seconds.",
    "A video is already being prepared. Wait until it finishes.",
    "The video engine could not load. Check your connection and try again.",
    "Video preparation failed. Try a shorter video.",
    "The video is still too large. Try a shorter video.",
    "Upload cancelled. Your previous media is preserved.",
    "Preparation took too long. Try a shorter video.",
  ],
  es: [
    "Elige una imagen JPG, PNG, WebP o AVIF de menos de 10 MB.",
    "Elige un vídeo MP4 o WebM de menos de 50 MB.",
    "No se puede reproducir este vídeo. Elige otro archivo.",
    "El vídeo de presentación debe durar como máximo 90 segundos.",
    "Ya se está preparando un vídeo. Espera a que termine.",
    "No se pudo cargar el motor de vídeo. Comprueba la conexión y reintenta.",
    "La preparación del vídeo falló. Prueba un vídeo más corto.",
    "El vídeo sigue siendo demasiado grande. Prueba uno más corto.",
    "Carga cancelada. Se conserva el contenido anterior.",
    "La preparación tardó demasiado. Prueba un vídeo más corto.",
  ],
  de: [
    "Wählen Sie ein JPG-, PNG-, WebP- oder AVIF-Bild unter 10 MB.",
    "Wählen Sie ein MP4- oder WebM-Video unter 50 MB.",
    "Dieses Video kann nicht abgespielt werden. Wählen Sie eine andere Datei.",
    "Das Präsentationsvideo darf höchstens 90 Sekunden dauern.",
    "Ein Video wird bereits vorbereitet. Warten Sie, bis es fertig ist.",
    "Die Videoverarbeitung konnte nicht geladen werden. Verbindung prüfen und erneut versuchen.",
    "Videovorbereitung fehlgeschlagen. Versuchen Sie ein kürzeres Video.",
    "Das Video ist noch zu groß. Versuchen Sie ein kürzeres Video.",
    "Upload abgebrochen. Ihre bisherigen Medien bleiben erhalten.",
    "Die Vorbereitung dauerte zu lange. Versuchen Sie ein kürzeres Video.",
  ],
  it: [
    "Scegli un’immagine JPG, PNG, WebP o AVIF inferiore a 10 MB.",
    "Scegli un video MP4 o WebM inferiore a 50 MB.",
    "Impossibile riprodurre questo video. Scegli un altro file.",
    "Il video di presentazione deve durare al massimo 90 secondi.",
    "Un video è già in preparazione. Attendi il completamento.",
    "Impossibile caricare il motore video. Verifica la connessione e riprova.",
    "Preparazione video non riuscita. Prova un video più breve.",
    "Il video è ancora troppo grande. Prova un video più breve.",
    "Caricamento annullato. I contenuti precedenti sono conservati.",
    "La preparazione ha richiesto troppo tempo. Prova un video più breve.",
  ],
  pt: [
    "Escolha uma imagem JPG, PNG, WebP ou AVIF inferior a 10 MB.",
    "Escolha um vídeo MP4 ou WebM inferior a 50 MB.",
    "Não é possível reproduzir este vídeo. Escolha outro ficheiro.",
    "O vídeo de apresentação deve durar no máximo 90 segundos.",
    "Já está a ser preparado um vídeo. Aguarde até terminar.",
    "Não foi possível carregar o motor de vídeo. Verifique a ligação e tente novamente.",
    "Falha na preparação do vídeo. Experimente um vídeo mais curto.",
    "O vídeo continua demasiado grande. Experimente um vídeo mais curto.",
    "Carregamento cancelado. Os conteúdos anteriores são preservados.",
    "A preparação demorou demasiado. Experimente um vídeo mais curto.",
  ],
};
/** Only known public validation messages are exposed; never reflect server errors. */
export function mediaErrorMessage(error: unknown, locale: Locale): string {
  const index =
    error instanceof Error
      ? sourceGroups.findIndex((group) => (group as readonly string[]).includes(error.message))
      : -1;
  return index >= 0 ? messages[locale][index]! : translateStatic(locale, "errors.body");
}
