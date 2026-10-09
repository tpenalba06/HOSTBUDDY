import type { Locale } from "./i18n";
const keys = [
  "team.role",
  "team.owner",
  "team.admin",
  "team.member",
  "team.add",
  "team.adding",
  "team.active",
  "team.change",
  "team.remove",
  "team.notice",
  "team.error",
  "team.removeConfirm",
  "team.loadFailed",
] as const;
const copy: Record<Locale, readonly string[]> = {
  fr: [
    "Rôle",
    "Propriétaire",
    "Responsable",
    "Employé",
    "Préparer l’accès",
    "Ajout…",
    "Membres actifs",
    "Modifier le rôle",
    "Retirer",
    "Accès enregistré. Aucun e-mail n’a été envoyé : partagez le lien d’inscription avec le membre.",
    "La modification a échoué. Réessayez.",
    "Retirer ce membre de l’équipe ?",
    "Impossible de charger l’équipe. Actualisez avant de modifier les accès.",
  ],
  en: [
    "Role",
    "Owner",
    "Manager",
    "Staff",
    "Prepare access",
    "Adding…",
    "Active members",
    "Change role",
    "Remove",
    "Access saved. No email was sent: share the signup link with the member.",
    "The change failed. Please try again.",
    "Remove this team member?",
    "Unable to load the team. Refresh before changing access.",
  ],
  es: [
    "Rol",
    "Propietario",
    "Responsable",
    "Empleado",
    "Preparar acceso",
    "Añadiendo…",
    "Miembros activos",
    "Cambiar rol",
    "Retirar",
    "Acceso guardado. No se envió ningún correo: comparte el enlace de registro.",
    "No se pudo guardar el cambio. Reintenta.",
    "¿Retirar a este miembro?",
    "No se pudo cargar el equipo. Actualiza antes de modificar los accesos.",
  ],
  de: [
    "Rolle",
    "Eigentümer",
    "Verantwortlicher",
    "Mitarbeiter",
    "Zugang vorbereiten",
    "Wird hinzugefügt…",
    "Aktive Mitglieder",
    "Rolle ändern",
    "Entfernen",
    "Zugang gespeichert. Es wurde keine E-Mail gesendet: Teile den Registrierungslink.",
    "Änderung fehlgeschlagen. Versuche es erneut.",
    "Dieses Teammitglied entfernen?",
    "Das Team konnte nicht geladen werden. Aktualisiere vor einer Zugangsänderung.",
  ],
  it: [
    "Ruolo",
    "Proprietario",
    "Responsabile",
    "Dipendente",
    "Prepara accesso",
    "Aggiunta…",
    "Membri attivi",
    "Modifica ruolo",
    "Rimuovi",
    "Accesso salvato. Nessuna e-mail inviata: condividi il link di registrazione.",
    "Modifica non riuscita. Riprova.",
    "Rimuovere questo membro?",
    "Impossibile caricare il team. Aggiorna prima di modificare gli accessi.",
  ],
  pt: [
    "Função",
    "Proprietário",
    "Responsável",
    "Funcionário",
    "Preparar acesso",
    "A adicionar…",
    "Membros ativos",
    "Alterar função",
    "Remover",
    "Acesso guardado. Nenhum e-mail enviado: partilhe o link de registo.",
    "A alteração falhou. Tente novamente.",
    "Remover este membro?",
    "Não foi possível carregar a equipa. Atualize antes de alterar os acessos.",
  ],
};
export function addTeamCopy(translations: Record<Locale, Record<string, string>>) {
  for (const locale of Object.keys(copy) as Locale[])
    keys.forEach((key, i) => {
      translations[locale][key] = copy[locale][i] ?? "";
    });
}

export function addMessageCopy(translations: Record<Locale, Record<string, string>>) {
  const values: Record<Locale, readonly string[]> = {
    fr: ["Vous", "Votre hôte", "Actualiser les réponses"],
    en: ["You", "Your host", "Refresh replies"],
    es: ["Tú", "Tu anfitrión", "Actualizar respuestas"],
    de: ["Du", "Dein Gastgeber", "Antworten aktualisieren"],
    it: ["Tu", "Il tuo host", "Aggiorna risposte"],
    pt: ["Você", "O seu anfitrião", "Atualizar respostas"],
  };
  for (const locale of Object.keys(values) as Locale[])
    ["message.you", "message.host", "message.refresh"].forEach((key, i) => {
      translations[locale][key] = values[locale][i] ?? "";
    });
}
