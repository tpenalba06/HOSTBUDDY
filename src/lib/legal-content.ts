/** French working drafts. Never present unresolved publisher facts as verified legal information. */
export type LegalDocument = {
  id: string;
  title: string;
  intro: string;
  sections: { title: string; paragraphs: string[] }[];
};

export const legalRevision = "9 octobre 2026 — version de travail Nona en français";

export const legalPublicationGaps = [
  "Éditeur identifié : Tristan Penalba, entrepreneur individuel, SIREN 992856641 / SIRET 99285664100012. Actualité de l’adresse professionnelle historique à confirmer avant publication définitive.",
  "Disponibilité du nom Nona et droits de propriété intellectuelle à vérifier avant lancement.",
  "Actualité de l’e-mail et du téléphone professionnels historiques et utilisation de ce contact pour les données personnelles à confirmer.",
  "Identité, adresse et téléphone de l’hébergeur du site commercialisé.",
  "Franchise de TVA mentionnée dans les documents de juin 2026 (article 293 B du CGI) : maintien du régime à confirmer pour l’abonnement et la commission, sans modifier les tarifs actés.",
  "Durées de conservation, procédure d’effacement, prestataires, pays d’hébergement et garanties de transfert.",
  "Conditions commerciales des gestionnaires professionnels, information des voyageurs avant collecte et avant paiement, et accord de sous-traitance RGPD à valider.",
];

export const legalDocuments: LegalDocument[] = [
  {
    id: "mentions-legales",
    title: "Mentions légales",
    intro:
      "Nona est le nom commercial retenu pour l’application de guides d’accueil numériques anciennement appelée HostBuddy, éditée par Tristan Penalba, entrepreneur individuel. La disponibilité juridique du nom Nona reste à vérifier. Cette version de travail doit être complétée et validée avant commercialisation.",
    sections: [
      {
        title: "Éditeur et responsable de publication",
        paragraphs: [
          "Éditeur : Tristan Penalba, entrepreneur individuel (EI). Nona est son nom commercial pour cette application ; une organisation cliente de conciergerie n’est pas l’éditeur du logiciel.",
          "SIREN : 992856641. SIRET du siège : 99285664100012. L’API publique officielle confirme une entreprise individuelle active et un établissement actif à Nice au 9 octobre 2026 ; le nom et l’adresse détaillée sont non diffusibles dans cette réponse. L’identité de l’éditeur est reprise des documents professionnels et de sa confirmation.",
          "Directeur de publication : Tristan Penalba. Les coordonnées professionnelles historiques ont été retrouvées ; leur actualité et leur utilisation pour Nona doivent être confirmées avant publication définitive. Adresse, e-mail et téléphone opérationnels ne sont pas encore publiés dans ce brouillon.",
          "Les documents professionnels de juin 2026 portent la mention « TVA non applicable, article 293 B du CGI ». Cette mention historique ne confirme pas le régime fiscal actuel ; ne pas la présenter comme définitive sans vérification.",
          "Le choix du nom Nona ne vaut ni dépôt ni confirmation de disponibilité d’une marque. Les droits antérieurs doivent être examinés séparément de l’immatriculation de l’éditeur.",
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
          "Tristan Penalba, entrepreneur individuel, éditeur de Nona identifié dans les mentions légales, détermine les finalités de la gestion des comptes, de son abonnement, du support et de la sécurité du service. L’actualité du contact professionnel pour exercer vos droits reste à confirmer avant publication définitive.",
          "Pour les messages, demandes de services et retours de voyageurs gérés pour un établissement, le responsable du traitement peut être le gestionnaire ou l’exploitant pour lequel il agit. Nona traite ces données pour leur compte dans le périmètre convenu. Cette répartition doit être confirmée dans un accord de sous-traitance RGPD ; le gestionnaire doit fournir sa propre information aux voyageurs.",
        ],
      },
      {
        title: "Données, finalités et bases légales",
        paragraphs: [
          "Comptes et équipes : identité de compte, e-mail, organisation, rôle et données de connexion permettent l’accès au service et la gestion des invitations. L’exécution du contrat constitue la base envisagée pour le titulaire ; la gestion des membres d’équipe doit être documentée au titre de l’intérêt légitime de l’organisation et de l’éditeur.",
          "Guides et médias : contenu du logement, coordonnées de contact et médias fournis par le gestionnaire servent à créer et publier son guide. Le gestionnaire doit éviter de publier des données personnelles ou des codes d’accès qui ne doivent pas être accessibles aux détenteurs du lien.",
          "Messages et demandes de services : nom d’affichage requis, contact facultatif, contenu du message ou service, quantité et montant servent au traitement de la demande. Retours privés : note requise, nom et commentaire facultatifs servent au retour adressé au gestionnaire. Celui-ci doit identifier le responsable du traitement, sa base légale et les informations fournies au moment de chaque collecte ; Nona traite ces données selon les instructions convenues.",
          "Paiements : les données de carte sont saisies auprès de Stripe. Nona conserve les identifiants utiles, montants, devises et statuts des abonnements et paiements pour le suivi du contrat, des demandes et des obligations comptables. Stripe traite également les informations nécessaires à la vérification du compte du gestionnaire.",
          "Sécurité : l’adresse IP transmise au serveur et les informations de navigateur contribuent notamment à une empreinte hachée pour limiter les abus des formulaires publics. Cette empreinte est pseudonymisée, pas réputée anonyme. Des données techniques de connexion sont également utilisées pour protéger le service. La portée, la durée et la mise en balance de cet intérêt légitime doivent être précisées avant commercialisation. Aucun profilage publicitaire ou décision automatisée produisant des effets juridiques n’est décrit dans cette version.",
        ],
      },
      {
        title: "Destinataires et transferts",
        paragraphs: [
          "Les membres autorisés de l’organisation accèdent aux informations nécessaires à leur rôle. Les visiteurs d’un guide accèdent aux contenus que son gestionnaire a publiés. Les conversations et retours privés ne constituent pas des contenus publics du guide.",
          "Des prestataires assurent l’hébergement, la base de données, l’authentification, le stockage des médias et les paiements. Stripe intervient pour les paiements et peut être responsable de traitement ou sous-traitant selon l’opération. Google intervient si la connexion Google est choisie, mais aussi lors du chargement des polices Google Fonts actuellement utilisées par les pages, indépendamment de cette connexion. La liste contractuelle complète, les entités, pays, fonctions et garanties de transfert restent à compléter.",
          "Les liens vers Google Maps, WhatsApp, les sites d’avis et d’autres sites externes conduisent vers les services choisis par le visiteur. Leurs traitements et informations s’appliquent alors ; un lien externe ne constitue pas à lui seul un traceur chargé sur la page Nona.",
          "Aucune localisation exclusivement européenne n’est garantie par ce brouillon. Les éventuels transferts hors de l’Espace économique européen et les moyens d’obtenir leurs garanties doivent être identifiés avant publication.",
        ],
      },
      {
        title: "Conservation et suppression",
        paragraphs: [
          "Les durées ou critères précis de conservation des comptes, contenus, messages, demandes, journaux et sauvegardes restent à valider et à mettre en œuvre. Pour les pièces comptables relevant du droit français, la conservation légale de dix ans doit être organisée séparément des données utilisées au quotidien ; elle ne justifie pas de conserver tous les messages ou contenus pendant dix ans.",
          "La suppression définitive d’un logement supprime ses contenus et échanges liés dans la base applicative et demande le nettoyage des médias ; ce nettoyage peut rester en attente en cas d’échec. Le registre financier est conservé séparément. Cette fonction ne démontre pas l’effacement de toutes les données d’un compte, des journaux et des sauvegardes.",
          "L’expiration de l’accès à une conversation ne signifie pas que ses messages ont été supprimés. L’archivage d’un logement ne constitue pas son effacement. Les copies hors ligne enregistrées sur l’appareil du voyageur restent locales jusqu’à leur suppression ou à l’effacement du stockage du navigateur.",
        ],
      },
      {
        title: "Vos droits et vos demandes",
        paragraphs: [
          "Selon la base légale et les conditions prévues par le RGPD, vous disposez de droits d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité. Si un traitement repose sur votre consentement, vous pouvez le retirer sans remettre en cause les traitements antérieurs.",
          "Pour une demande concernant un compte Nona, le contact de l’éditeur doit être complété avant commercialisation. Pour des données adressées à un établissement, contactez d’abord son gestionnaire via les coordonnées de son guide ; Nona l’assiste dans le traitement de la demande.",
          "Une demande de droits reçoit une réponse dans le délai légal d’un mois ; une prolongation motivée de deux mois est possible dans les cas prévus par le RGPD. Le responsable du traitement doit informer la personne de cette prolongation dans le premier mois. Ce délai légal ne constitue pas une promesse d’effacement immédiat.",
          "Vous pouvez introduire une réclamation auprès de la CNIL. Les données nécessaires au compte ou à une demande sont signalées dans les formulaires ; leur absence peut empêcher le traitement de la demande. Ne transmettez pas de document d’identité ou de donnée sensible dans un message ordinaire.",
        ],
      },
    ],
  },
  {
    id: "conditions",
    title: "Conditions d’utilisation et d’abonnement",
    intro:
      "Projet de conditions entre Tristan Penalba, entrepreneur individuel, éditeur de Nona, et les gestionnaires professionnels utilisateurs du service. Ce document ne constitue pas encore des conditions contractuelles définitives ; les points signalés doivent être validés avant commercialisation.",
    sections: [
      {
        title: "Service, compte et responsabilité des contenus",
        paragraphs: [
          "Nona permet de créer un guide, d’y publier des informations et médias, de recevoir des messages et demandes de services et de gérer une équipe. Le gestionnaire conserve la responsabilité de ses informations, droits de publication, offres et obligations envers ses voyageurs.",
          "Le propriétaire de l’organisation gère les accès de son équipe et les fonctions financières. Chaque utilisateur doit protéger son accès, respecter les droits des tiers et s’abstenir d’importer des contenus sans autorisation. Les fonctions disponibles dépendent de leur activation ; aucun connecteur annoncé ne vaut connexion opérationnelle.",
        ],
      },
      {
        title: "Offre et prix de l’abonnement",
        paragraphs: [
          "Un logement est gratuit, sans carte bancaire. L’offre payante affiche 9,99 € par mois pour deux logements, puis 2,99 € par mois par logement supplémentaire. Ces montants sont les tarifs retenus. Le maintien de la franchise de TVA historique et la mention fiscale applicable restent à confirmer avant commercialisation ; ce brouillon n’ajoute aucune TVA aux montants annoncés.",
          "Les logements en brouillon et publiés sont comptés ; les logements archivés sont exclus. Au-delà de la capacité déjà payée pour la période, une augmentation donne lieu à une facturation au prorata et la capacité supplémentaire exige son paiement. Une diminution prépare le prochain renouvellement : elle ne déclenche pas de crédit automatique pour la période en cours. Le retour à un logement ou moins programme l’arrêt de l’offre payante à l’échéance, sous réserve de la synchronisation effective.",
          "Ces règles décrivent le fonctionnement examiné. Les prix, taxes et conséquences d’un changement doivent être communiqués avant l’engagement ; les modalités commerciales définitives restent à approuver.",
        ],
      },
      {
        title: "Renouvellement, résiliation et impayés",
        paragraphs: [
          "Le portail de facturation accessible depuis l’espace gestionnaire est configuré pour une résiliation à la fin de la période en cours. Il permet de consulter les factures et de gérer les coordonnées de facturation et le moyen de paiement. Les conditions commerciales définitives, notamment les éventuels remboursements de l’abonnement et le sort des guides après la fin du contrat, restent à valider.",
          "Un abonnement non autorisé pour le nombre de logements peut empêcher leur publication. Les données du gestionnaire ne sont pas supprimées du seul fait de cette restriction. Les délais de régularisation, pénalités de retard et éventuelle indemnité forfaitaire applicables aux professionnels doivent être fixés avant commercialisation.",
        ],
      },
      {
        title: "Services voyageurs, Stripe et commission",
        paragraphs: [
          "Le gestionnaire publie les services proposés dans son guide et organise le traitement des demandes avec le vendeur concerné. Une demande ne garantit pas à elle seule la réservation ou l’exécution du service. Le gestionnaire doit informer le voyageur du prix, des modalités d’exécution, de l’annulation, du remboursement et des droits applicables avant un engagement payant.",
          "L’identité du vendeur du service doit être fournie au voyageur. Selon les offres et contrats, ce vendeur peut être le gestionnaire, l’exploitant ou un prestataire ; Nona ne doit pas être présenté automatiquement comme ce vendeur. Les droits du consommateur, les éventuelles exceptions à la rétractation pour des services à date déterminée et la médiation doivent être vérifiés pour chaque catégorie de prestation.",
          "Les encaissements nécessitent un compte Stripe relié à l’organisation et autorisé par Stripe. Un retour de l’onboarding ne suffit pas à autoriser l’encaissement. Stripe assure le traitement du paiement selon ses propres conditions et exigences.",
          "La commission Nona est calculée à 2 % du montant total de chaque commande payée, arrondie au centime par commande. Elle est prélevée sur l’encaissement du compte connecté, séparément des frais Stripe et de l’abonnement Nona ; l’application ne l’ajoute pas comme supplément au prix payé par le voyageur. Le régime de TVA de cette commission et les documents de facturation restent à confirmer.",
          "La fonction de remboursement Nona demande actuellement un remboursement intégral du paiement et de sa commission applicative. Les frais de traitement Stripe restent distincts et soumis aux conditions Stripe applicables. Les remboursements partiels effectués hors de cette fonction doivent être encadrés séparément ; l’affichage d’un statut partiellement remboursé ne prouve pas que Nona propose cette action. Les règles d’annulation et les droits du voyageur doivent être fixés avant la vente.",
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
        title: "Conversations, favoris et guides hors ligne",
        paragraphs: [
          "Lorsque vous ouvrez une conversation, un accès privé est conservé dans le navigateur pour retrouver vos échanges. Cet accès est valable trente jours ; l’expiration de l’accès n’efface pas automatiquement les messages ni la copie locale de l’accès.",
          "Les lieux ajoutés aux favoris sont mémorisés sur votre appareil. La session de connexion, la langue, les favoris et les copies hors ligne n’ont pas de durée maximale propre fixée dans le code examiné ; ils peuvent rester jusqu’à leur suppression, leur remplacement, la déconnexion pour la session ou l’effacement du stockage par le navigateur. L’expiration du droit d’accès côté serveur n’est pas une suppression automatique de ces copies locales.",
          "Si vous demandez l’enregistrement hors ligne d’un guide, son texte et les médias téléchargés sont conservés sur votre appareil. Supprimez la copie depuis les fonctions hors ligne du guide ou les réglages du navigateur, notamment sur un appareil partagé. Une copie déjà téléchargée ne disparaît pas automatiquement lorsque le gestionnaire modifie son guide.",
        ],
      },
      {
        title: "Services tiers et traceurs facultatifs",
        paragraphs: [
          "Les pages de connexion Google et de paiement Stripe peuvent utiliser leurs propres cookies et technologies ; leurs informations s’appliquent à ces pages. Le chargement de Google Fonts crée également des requêtes vers Google depuis les pages Nona : ce flux doit figurer dans l’examen des données et transferts, même sans cookie publicitaire. La liste des traceurs, stockages et durées du domaine définitif reste à confirmer avant publication.",
          "L’ajout éventuel de traceurs d’audience non exemptés, publicitaires ou de contenus tiers soumis au consentement doit être précédé d’un choix permettant de refuser aussi facilement que d’accepter et de retirer son consentement. Aucun consentement à de tels traceurs n’est recueilli ni présumé sur cette page.",
        ],
      },
    ],
  },
];
