# Nona — projet d’annexe de sous-traitance RGPD

Version du 9 octobre 2026. **Document de préparation, non accepté et non définitif.** Ce projet n’est pas une reproduction des clauses contractuelles types de la Commission. Il ne vaut pas engagement signé ni garantie de transfert international. Il doit être annexé au contrat approuvé et complété avec les éléments opérationnels réels.

## Parties et périmètre

- Éditeur juridique exploitant le nom commercial Nona : **Tristan Penalba, entrepreneur individuel (EI), SIREN 992856641, SIRET du siège 99285664100012**. Identité reprise des documents professionnels du 24 juin 2026 et de la confirmation du titulaire ; entreprise individuelle et établissement actifs à Nice vérifiés via l’API officielle le 9 octobre 2026. Les coordonnées historiques sont retrouvées dans le dossier privé de reprise ; leur actualité et leur utilisation pour Nona restent à confirmer avant contractualisation. La non-diffusion publique de l’adresse ne supprime pas l’obligation de renseigner les mentions légales du site commercialisé.
- Client : entité, représentant habilité et contact données personnelles à compléter.
- Responsable du traitement : identifier l’exploitant/gestionnaire qui décide de l’usage des données des voyageurs. Si la conciergerie agit elle-même pour le compte d’un propriétaire/exploitant, documenter les instructions et l’autorisation de recourir à Nona comme sous-traitant ultérieur. Ne pas qualifier toutes les conciergeries automatiquement de responsables.
- Nona : sous-traitant des données confiées pour les guides et opérations voyageurs, dans le périmètre documenté. Ses traitements propres de compte, facturation, commission, support et sécurité restent distincts.

## Annexe A — traitements confiés observés dans le code

| Objet / opérations                                                        | Données                                                                            | Personnes                                                                  | Finalité / instruction à documenter                                                      |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Héberger, modifier, traduire manuellement et publier les guides et médias | Informations du logement, contacts, textes, photos, vidéos, provenance des imports | Contacts, personnels, personnes éventuellement présentes dans les contenus | Créer le guide demandé ; publier uniquement les informations sélectionnées et autorisées |
| Recevoir, stocker et afficher les conversations privées                   | Nom, contact facultatif, messages, dates, statut, accès privé                      | Voyageurs, membres habilités de l’organisation                             | Traiter les questions des voyageurs                                                      |
| Recevoir les demandes de services et suivre leur statut                   | Nom, contact facultatif, service, quantité, montant, dates/statut                  | Voyageurs, interlocuteurs/prestataires identifiables                       | Organiser la prestation demandée ; identifier le vendeur réel séparément                 |
| Recevoir les retours privés                                               | Note, nom/commentaire facultatifs                                                  | Voyageurs                                                                  | Retour destiné à l’établissement ; pas publication automatique d’avis                    |
| Gérer les habilitations et médias liés                                    | Rôles, organisation/logement, chemins de médias et droits d’accès                  | Gestionnaires, équipes                                                     | Limiter les accès aux personnes autorisées                                               |
| Suppression du logement et nettoyage                                      | Contenus et opérations liés ; chemins de nettoyage                                 | Personnes concernées ci-dessus                                             | Suppression sur instruction habilitée ; traitement des erreurs de nettoyage              |

Les données sensibles ne sont pas demandées par ces fonctions. Leur réception accidentelle dans un texte libre reste possible : prévoir consigne de minimisation et procédure de retrait. Ne pas déclarer leur traitement impossible.

La traduction automatique dispose d’une frontière technique mais son fournisseur n’est pas connecté dans la version examinée. Aucun envoi applicatif de traduction à un fournisseur IA n’est établi. Le développement assisté par Lovable et ses propres fournisseurs doit être distingué de cette fonctionnalité. Ne pas envoyer des données voyageurs réelles dans des prompts de développement.

## Annexe B — engagements à intégrer et rendre opérationnels

Projet de clauses à soumettre à validation :

1. Nona traite les données confiées uniquement sur instructions documentées, signale une instruction illicite et encadre la confidentialité des personnes autorisées.
2. Les sous-traitants ultérieurs nécessitent une autorisation écrite, une liste tenue à jour, une information des changements et des modalités d’objection ; leurs obligations sont répercutées par contrat.
3. Nona contribue aux demandes de droits, aux analyses de risques et aux audits. Une violation est notifiée au responsable sans retard injustifié, avec les éléments disponibles puis complétés. Les 72 heures applicables à certaines notifications du responsable à l’autorité ne constituent pas un délai d’attente accordé au sous-traitant.
4. À la fin de la prestation, le client choisit retour ou suppression des données confiées, sous réserve des obligations légales distinctes. Les copies et sauvegardes doivent être couvertes.
5. Toute opération hors EEE nécessite une cartographie et un mécanisme de transfert approprié distinct du seul accord article 28.

À fixer avant signature : personnes habilitées, canal d’incident/droits, délais de coopération, modalités d’audit, autorisation des prestataires, procédure de restitution, format d’export, coût éventuel, délai de purge et suppression dans les sauvegardes. Ne pas promettre une exportation autonome ou une purge automatique non développées.

## Annexe C — mesures constatées et preuves manquantes

| Mesure                                            | Constat source                                                                                    | Limite avant engagement contractuel                                                                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Isolation des organisations et rôles              | RLS et accès serveur bornés à l’organisation ; owner/admin/member                                 | Les contrôles source et validations précédentes ne remplacent pas les procédures de gestion des habilitations et leur revue                          |
| Publication                                       | Lecture des guides publiés via fonction serveur ; médias à URL signée                             | Un lien de guide est partageable ; une URL signée n’empêche pas la copie déjà téléchargée                                                            |
| Conversation                                      | Jeton privé aléatoire, empreinte côté base, validité 30 jours ; pas de jeton dans l’URL           | Ce délai expire l’accès, pas les messages ; le jeton local peut rester sur l’appareil                                                                |
| Anti-abus                                         | Validation, limitation des demandes, empreinte hachée IP/navigateur/guide                         | Fenêtres de limitation différentes des durées de conservation ; purge à documenter                                                                   |
| Suppression d’un logement                         | Transaction supprime les données liées ; médias nettoyés séparément ; registre financier préservé | Échec média possible ; compte, sauvegardes et journaux ne sont pas couverts par cette seule fonction                                                 |
| Paiement                                          | Carte saisie chez Stripe ; identifiants/statuts et montants applicatifs                           | Rôles Stripe par traitement à valider ; ne pas déclarer Stripe uniquement sous-traitant                                                              |
| Sauvegarde, chiffrement infrastructure, incidents | Prestataires techniques identifiés au niveau produit                                              | Région exacte, contrats, accès support, sauvegardes, restauration, chiffrement et procédures internes à obtenir ; aucune certification Nona affirmée |

## Annexe D — prestataires à contractualiser

| Service observé                             | Fonction                                                          | Qualification à confirmer                                                                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Lovable Cloud / backend compatible Supabase | Hébergement, base, auth et stockage médias de la version examinée | Identifier l’entité contractante réelle et les sous-traitants de cette chaîne ; un SDK Supabase ne prouve pas un contrat direct avec Supabase |
| Stripe                                      | Abonnement, Connect et services                                   | Rôles propres/sous-traitance selon les traitements ; obligations de chaque vendeur                                                            |
| Google                                      | OAuth si choisi ; Google Fonts chargé indépendamment              | Distinguer connexion et requêtes de polices ; entités, données et transferts à qualifier                                                      |
| Prestataires supplémentaires                | E-mail, monitoring, infrastructure effective                      | Ne lister que ceux réellement actifs ; une entrée du registre des intégrations n’est pas une connexion                                        |

Région actuelle non établie par le code. Lecture gratuite possible dans Lovable : More → Cloud → Overview → Advanced settings → Database location. Une région backend ne garantit pas la localisation de tous les traitements de support, CDN et prestataires.

## Annexe E — conservation et fin de contrat

La politique de conservation détaillée reste à approuver. L’absence actuelle de tâche de purge établie ne doit pas devenir une durée illimitée contractuelle.

- Séparer données actives, archives nécessaires et suppression définitive.
- Messages, retours et demandes : instructions/durées de l’exploitant, avec borne contractuelle et traitement des litiges éventuels.
- Contenus : durée de fourniture du service et restitution/suppression en fin de contrat à fixer.
- Preuves financières et comptables : obligations propres du vendeur et de l’éditeur ; ne pas appliquer une durée comptable à tous les échanges.
- Sauvegardes : cycle et délai de disparition à établir avec l’hébergeur ; ne pas restaurer sans traiter les suppressions intervenues.
- Copies hors ligne : informer les utilisateurs de leur caractère local ; ne pas promettre une révocation à distance.

## Annexe F — notice courte voyageur à personnaliser avant intégration

**Modèle de travail, ne pas publier avec les champs manquants.** Chaque gestionnaire doit l’adapter au responsable réel, à la demande concernée et au contrat de son établissement. La notice détaillée doit rester accessible avant l’envoi et préciser les destinataires, transferts, durées et droits.

> [Identité du responsable et contact] utilise votre [nom/contact, message ou demande de service, ou note/commentaire selon le formulaire] pour [répondre à votre demande / organiser la prestation / traiter votre retour]. [Base légale justifiée à renseigner pour ce traitement]. Les champs obligatoires sont indiqués ; sans eux, nous ne pouvons pas traiter cette demande. Les personnes habilitées de [établissement] et ses prestataires techniques, dont l’éditeur du service Nona, accèdent aux seules informations utiles. Conservation : [durée ou critères validés]. Vous pouvez exercer les droits applicables auprès de [contact] et saisir la CNIL. Détails : [lien de la notice complète de cet établissement].

Le retour privé n’est pas assimilé à un avis public ni à un consentement marketing. Une case « j’accepte la confidentialité » n’est pas la base légale universelle de ces formulaires. Ne pas exiger une pièce d’identité pour une simple demande de service.

### Fiche de service à fournir avant l’engagement payant

- Vendeur réel : [identité, coordonnées professionnelles et immatriculation applicable] ; préciser un éventuel mandat du gestionnaire.
- Service : [description, quantité, date/modalités d’exécution, restrictions éventuelles].
- Prix total voyageur : [montant et taxes applicables], cohérent avec l’encaissement. Les 2 % retenus au vendeur ne sont pas présentés comme des frais de carte ajoutés au client.
- Formation du contrat : distinguer demande, confirmation par le vendeur et engagement payant ; récapitulatif vérifiable et preuve de confirmation.
- Annulation, remboursement, rétractation/exception propre à ce service, demande d’exécution anticipée si pertinente : [conditions approuvées].
- Réclamation et médiateur de la consommation si requis : [contacts/lien] ; documents accessibles avant confirmation.

Nona ne peut pas remplir uniformément ces informations pour toutes les conciergeries. Ce modèle prépare la collecte et la notice à intégrer ; il ne prouve pas leur présence actuelle dans le guide ou le Checkout.

## Sources officielles

Consultées le 9 octobre 2026 :

- https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre4 — articles 28, 30, 32 et 33.
- https://www.cnil.fr/fr/clauses-contractuelles-types-entre-responsable-de-traitement-et-sous-traitant — contrat article 28 et distinction avec les clauses de transfert.
- https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees — cycle actif/archives/suppression.
- https://docs.lovable.dev/features/cloud — lecture de la région du projet.
- https://stripe.com/fr/privacy — rôles Stripe variables selon les traitements.
