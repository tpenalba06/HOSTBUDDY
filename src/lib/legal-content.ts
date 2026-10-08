/** French working drafts. Never present unresolved publisher facts as verified legal information. */
export type LegalDocument = {
  id: string;
  title: string;
  intro: string;
  sections: { title: string; paragraphs: string[] }[];
};

export const legalRevision = "8 octobre 2026 — version de travail en français";

export const legalPublicationGaps = [
  "Identité légale de l’éditeur, statut, SIREN, immatriculation et adresse professionnelle.",
  "E-mail et téléphone professionnels, responsable de publication et contact pour les données personnelles.",
  "Identité, adresse et téléphone de l’hébergeur du site commercialisé.",
  "Régime de TVA et qualification HT ou TTC des prix affichés.",
  "Durées de conservation, procédure d’effacement, prestataires, pays d’hébergement et garanties de transfert.",
  "Périmètre des clients professionnels, modalités de résiliation et de remboursement, traitement des litiges et accord de sous-traitance RGPD.",
];

export const legalDocuments: LegalDocument[] = [
  {
    id: "mentions-legales",
    title: "Mentions légales",
    intro:
      "HostBuddy est un service de création et de diffusion de guides d’accueil numériques, exploité par l’éditeur identifié ci-dessous. Les informations manquantes doivent être renseignées avant commercialisation.",
    sections: [
      {
        title: "Éditeur et responsable de publication",
        paragraphs: [
          "Nom légal ou dénomination : à compléter. Forme juridique : à compléter. Pour une entreprise individuelle, faire figurer les nom et prénom de l’entrepreneur avec la mention « entrepreneur individuel » ou « EI ».",
          "Adresse professionnelle, SIREN, immatriculation applicable et numéro de TVA ou régime d’exonération : à compléter. Capital social uniquement si la forme juridique l’exige.",
          "Responsable de publication, e-mail et téléphone professionnels : à compléter. Aucun contact fictif n’est présenté comme un contact opérationnel.",
        ],
      },
      {
        title: "Hébergement",
        paragraphs: [
          "Nom ou dénomination de l’hébergeur du site commercialisé, adresse et téléphone : à compléter. L’hébergement de la préversion ne permet pas de présumer celui du site définitif.",
        ],
      },
      {
        title: "Contenus des guides et propriété intellectuelle",
        paragraphs: [
          "Le gestionnaire d’un guide est responsable des informations, photographies, vidéos, recommandations et offres qu’il publie. Il doit disposer des droits et autorisations nécessaires et maintenir ses informations à jour.",
          "L’accès à un guide ne transfère aucun droit de propriété sur son contenu. Un import depuis une page tierce ne vaut pas autorisation de réutiliser ses textes ou médias.",
        ],
      },
    ],
  },
  {
    id: "confidentialite",
    title: "Politique de confidentialité",
    intro:
      "Cette version décrit les traitements liés aux comptes gestionnaires et aux guides voyageurs. Les coordonnées, durées et prestataires encore manquants doivent être complétés avant sa publication définitive.",
    sections: [
      {
        title: "Qui traite les données ?",
        paragraphs: [
          "L’éditeur HostBuddy, dont l’identité et le contact sont à compléter dans les mentions légales, détermine les finalités de la gestion des comptes, de son abonnement, du support et de la sécurité du service.",
          "Pour les messages, demandes de services et retours de voyageurs gérés pour un établissement, le gestionnaire détermine en principe les finalités du traitement et HostBuddy intervient pour son compte. Cette répartition doit être confirmée dans un accord de sous-traitance RGPD ; le gestionnaire doit fournir sa propre information aux voyageurs.",
        ],
      },
      {
        title: "Données, finalités et bases légales",
        paragraphs: [
          "Comptes et équipes : identité de compte, e-mail, organisation, rôle et données de connexion permettent l’accès au service et la gestion des invitations. L’exécution du contrat constitue la base envisagée pour le titulaire ; la gestion des membres d’équipe doit être documentée au titre de l’intérêt légitime de l’organisation et de l’éditeur.",
          "Guides et médias : contenu du logement, coordonnées de contact et médias fournis par le gestionnaire servent à créer et publier son guide. Le gestionnaire doit éviter de publier des données personnelles ou des codes d’accès qui ne doivent pas être accessibles aux détenteurs du lien.",
          "Messages, services et retours : nom d’affichage, contact renseigné, contenu du message, demande, montant, date et retour privé servent au traitement de la demande par l’établissement. Le gestionnaire fixe et documente la base légale applicable ; HostBuddy traite ces données selon ses instructions.",
          "Paiements : les données de carte sont saisies auprès de Stripe. HostBuddy conserve les identifiants utiles, montants, devises et statuts des abonnements et paiements pour le suivi du contrat, des demandes et des obligations comptables. Stripe traite également les informations nécessaires à la vérification du compte du gestionnaire.",
          "Sécurité : des données techniques de connexion et de limitation des abus sont utilisées pour protéger le service. La portée, la durée et la mise en balance de cet intérêt légitime doivent être précisées avant commercialisation. Aucun profilage publicitaire ou décision automatisée produisant des effets juridiques n’est décrit dans cette version.",
        ],
      },
      {
        title: "Destinataires et transferts",
        paragraphs: [
          "Les membres autorisés de l’organisation accèdent aux informations nécessaires à leur rôle. Les visiteurs d’un guide accèdent aux contenus que son gestionnaire a publiés. Les conversations et retours privés ne constituent pas des contenus publics du guide.",
          "Des prestataires assurent l’hébergement, la base de données, l’authentification, le stockage des médias et les paiements. Stripe intervient pour les paiements ; Google intervient si la connexion Google est choisie. La liste contractuelle complète, les entités, pays, fonctions et garanties de transfert restent à compléter.",
          "Aucune localisation exclusivement européenne n’est garantie par ce brouillon. Les éventuels transferts hors de l’Espace économique européen et les moyens d’obtenir leurs garanties doivent être identifiés avant publication.",
        ],
      },
      {
        title: "Conservation et suppression",
        paragraphs: [
          "Les durées ou critères précis de conservation des comptes, contenus, messages, demandes, journaux, sauvegardes et pièces de facturation restent à valider. La fermeture d’un compte et les obligations de conservation doivent être distinguées.",
          "L’expiration de l’accès à une conversation ne signifie pas que ses messages ont été supprimés. L’archivage d’un logement ne constitue pas son effacement. Les copies hors ligne enregistrées sur l’appareil du voyageur restent locales jusqu’à leur suppression ou à l’effacement du stockage du navigateur.",
        ],
      },
      {
        title: "Vos droits et vos demandes",
        paragraphs: [
          "Selon la base légale et les conditions prévues par le RGPD, vous disposez de droits d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité. Si un traitement repose sur votre consentement, vous pouvez le retirer sans remettre en cause les traitements antérieurs.",
          "Pour une demande concernant un compte HostBuddy, le contact de l’éditeur doit être complété avant commercialisation. Pour des données adressées à un établissement, contactez d’abord son gestionnaire via les coordonnées de son guide ; HostBuddy l’assiste dans le traitement de la demande.",
          "Vous pouvez introduire une réclamation auprès de la CNIL. Les données nécessaires au compte ou à une demande sont signalées dans les formulaires ; leur absence peut empêcher le traitement de la demande. Ne transmettez pas de document d’identité ou de donnée sensible dans un message ordinaire.",
        ],
      },
    ],
  },
  {
    id: "conditions",
    title: "Conditions d’utilisation et d’abonnement",
    intro:
      "Projet de conditions pour les gestionnaires professionnels. Ce document ne constitue pas encore des conditions contractuelles définitives ; le périmètre des clients et les points signalés doivent être validés avant commercialisation.",
    sections: [
      {
        title: "Service, compte et responsabilité des contenus",
        paragraphs: [
          "HostBuddy permet de créer un guide, d’y publier des informations et médias, de recevoir des messages et demandes de services et de gérer une équipe. Le gestionnaire conserve la responsabilité de ses informations, droits de publication, offres et obligations envers ses voyageurs.",
          "Le propriétaire de l’organisation gère les accès de son équipe et les fonctions financières. Chaque utilisateur doit protéger son accès, respecter les droits des tiers et s’abstenir d’importer des contenus sans autorisation. Les fonctions disponibles dépendent de leur activation ; aucun connecteur annoncé ne vaut connexion opérationnelle.",
        ],
      },
      {
        title: "Offre et prix de l’abonnement",
        paragraphs: [
          "Un logement est gratuit, sans carte bancaire. L’offre payante affiche 9,99 € par mois pour deux logements, puis 2,99 € par mois par logement supplémentaire. La qualification HT ou TTC et le régime de TVA doivent être précisés avant commercialisation.",
          "L’abonnement et sa période de facturation sont présentés au moment de la souscription. Le nombre de logements non archivés intervient dans le calcul. Toute variation de prix, proratisation ou promotion applicable doit être annoncée avant confirmation ; ce brouillon ne crée pas de remise ni de garantie de prix supplémentaire.",
        ],
      },
      {
        title: "Renouvellement, résiliation et impayés",
        paragraphs: [
          "La gestion de l’abonnement passe par le portail de facturation accessible depuis l’espace gestionnaire. La période, le renouvellement et la date d’effet d’une résiliation doivent correspondre aux informations affichées dans ce portail. Les règles définitives de résiliation, changement d’offre et remboursement restent à compléter.",
          "Un abonnement non autorisé pour le nombre de logements peut empêcher leur publication. Les données du gestionnaire ne sont pas supprimées du seul fait de cette restriction. Les délais de régularisation, pénalités de retard et éventuelle indemnité forfaitaire applicables aux professionnels doivent être fixés avant commercialisation.",
        ],
      },
      {
        title: "Services voyageurs, Stripe et commission",
        paragraphs: [
          "Le gestionnaire définit et fournit les services proposés dans son guide. Une demande ne garantit pas à elle seule la réservation ou l’exécution du service. Le gestionnaire doit informer le voyageur du prix, des modalités d’exécution, de l’annulation, du remboursement et des droits applicables avant un engagement payant.",
          "Les encaissements nécessitent un compte Stripe relié à l’organisation et autorisé par Stripe. Un retour de l’onboarding ne suffit pas à autoriser l’encaissement. Stripe assure le traitement du paiement selon ses propres conditions et exigences.",
          "La commission HostBuddy est de 2 % du montant des services payés, distincte des frais Stripe et de l’abonnement HostBuddy. Le gestionnaire conserve ses obligations fiscales et commerciales. La politique définitive de remboursement du service, de la commission et des frais Stripe doit être publiée ; aucune gratuité ou remboursement automatique n’est promis par ce brouillon.",
        ],
      },
      {
        title: "Disponibilité, fin du contrat et litiges",
        paragraphs: [
          "Le service peut nécessiter des opérations de maintenance. Aucun niveau de disponibilité chiffré ni délai de support garanti n’est fixé dans ce projet. Les conditions de suspension, export, récupération et suppression des données à la fin du contrat restent à définir.",
          "Le droit applicable et les modalités de règlement des litiges doivent être complétés sans écarter les dispositions impératives. Si des clients consommateurs ou bénéficiant de protections assimilées sont admis, adapter les informations précontractuelles, la rétractation, la résiliation et la médiation avant commercialisation.",
        ],
      },
    ],
  },
  {
    id: "cookies",
    title: "Cookies et stockage sur votre appareil",
    intro:
      "Le stockage du navigateur peut servir à maintenir votre connexion, votre langue, votre conversation ou une copie hors ligne. La présente information couvre aussi le stockage local, et pas uniquement les cookies.",
    sections: [
      {
        title: "Fonctions de connexion et préférences",
        paragraphs: [
          "La session de connexion est enregistrée sur l’appareil pour permettre l’accès à l’espace gestionnaire. La préférence de langue peut être conservée entre les visites. Vous pouvez supprimer ces données dans les réglages de votre navigateur ; cela peut vous déconnecter ou réinitialiser votre langue.",
          "Les opérations strictement nécessaires au service demandé et certaines préférences attendues peuvent être exemptées du consentement aux traceurs. Cette exemption ne dispense pas du respect des règles relatives aux données personnelles.",
        ],
      },
      {
        title: "Conversations et guides hors ligne",
        paragraphs: [
          "Lorsque vous ouvrez une conversation, un accès privé est conservé dans le navigateur pour retrouver vos échanges. Cet accès est valable trente jours ; l’expiration de l’accès n’efface pas automatiquement les messages ni la copie locale de l’accès.",
          "Si vous demandez l’enregistrement hors ligne d’un guide, son texte et les médias téléchargés sont conservés sur votre appareil. Supprimez la copie depuis les fonctions hors ligne du guide ou les réglages du navigateur, notamment sur un appareil partagé. Une copie déjà téléchargée ne disparaît pas automatiquement lorsque le gestionnaire modifie son guide.",
        ],
      },
      {
        title: "Services tiers et traceurs facultatifs",
        paragraphs: [
          "Les pages de connexion Google et de paiement Stripe peuvent utiliser leurs propres cookies et technologies ; leurs informations s’appliquent à ces pages. La liste des traceurs et durées du domaine définitif HostBuddy reste à confirmer avant publication.",
          "L’ajout éventuel de traceurs d’audience non exemptés, publicitaires ou de contenus tiers soumis au consentement doit être précédé d’un choix permettant de refuser aussi facilement que d’accepter et de retirer son consentement. Aucun consentement à de tels traceurs n’est recueilli ni présumé sur cette page.",
        ],
      },
    ],
  },
];
