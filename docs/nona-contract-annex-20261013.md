# Nona — annexe technique et clauses à approuver

**Brouillon interne, aucune acceptation ni mise en ligne définitive.** Éditeur déjà identifié : Tristan Penalba, EI, SIREN 992856641, SIRET 99285664100012. Confirmer seulement les coordonnées professionnelles actuelles, le contact de publication et le régime TVA. Ne pas redemander l’identité ni les tarifs.

## Hébergement et chaîne contractuelle

Service observé : Lovable Cloud avec infrastructure Supabase ; base en Irlande. Ce constat ne couvre pas la localisation de tous les CDN, journaux, supports et traitements des fournisseurs. Conserver le domaine publié actuel pour éviter une dépense supplémentaire.

La page officielle du DPA Lovable indique son inclusion pour Business/Enterprise ; elle nomme Lovable Labs Incorporated à Boston et un DPO à `dpo@lovable.dev`, avec contact Lovable Labs AB à Stockholm. Le workspace actuel est **Pro**, confirmé par lecture de métadonnées sans génération ni achat. L’applicabilité du DPA à ce compte et aux utilisateurs finaux n’est donc pas attestée par cette page. Vérifier le contrat/facture ou obtenir confirmation écrite. Ne pas acheter un plan, accepter un accord, affirmer qu’un DPA couvre le compte ni choisir l’entité de facturation par supposition. Les cartes et documents KYC restent chez Stripe, sans copie dans Nona.

Prestataires à annexer après vérification des contrats : Lovable/infrastructure Supabase (app, DB, Auth, médias) ; Stripe (abonnements, services, KYC) ; Google (connexion facultative et polices effectivement chargées). Vérifier entités et garanties de transferts sur les documents applicables, sans ajouter un fournisseur de traduction non connecté. GitHub ne reçoit pour l’exploitation autorisée que ciphertexts de sauvegarde et événements fixes ; toute copie du backend commercial exige une autorisation dédiée et son contrat applicable.

## Annexe article 28 — texte proposé

Le gestionnaire détermine les finalités des messages, demandes de services et retours voyageurs. Nona les traite pour son compte afin d’exécuter le service, selon ses instructions documentées et pendant le contrat. Nona conserve un rôle propre pour ses comptes, facturation et sécurité, décrit dans la confidentialité.

Nona limite les accès aux personnes autorisées tenues à confidentialité, applique les mesures de cette annexe, assiste le gestionnaire pour les droits et incidents, l’informe des instructions illicites et permet les vérifications documentées. Les sous-traitants ultérieurs figurent dans une annexe approuvée, avec procédure d’information et d’objection. Les transferts sont encadrés par les garanties applicables. En fin de service, restitution et effacement sont convenus, sous réserve des obligations légales ; l’expiration des sauvegardes doit correspondre à la politique effective.

Ces clauses et la procédure d’incident restent à valider, sans promesse de délai ou SLA non établi.

## Mesures déjà implémentées, sans promettre le déploiement commercial

- Isolation par organisation et permissions owner/admin/member, RPC publique limitée aux guides publiés, médias privés et URLs signées.
- Auth confirmée, inscriptions anonymes désactivées, protections de mot de passe ; tokens et clés serveur exclus du client.
- Paiements hébergés Stripe, vérification des signatures/modes et idempotence ; contrôle des capacités vendeurs ; aucun stockage de carte ou document KYC.
- Logs d’incident à champs fixes ; transport borné ; copie DB/Auth et médias chiffrée en TEST, preuve de restauration isolée acquise. La couverture commerciale attend ses accès et autorisations.
- Copies hors ligne locales volontaires : l’effacement du serveur ne supprime pas automatiquement les copies sur les appareils.

## Conservation — décisions finies à choisir, pas de purge lancée

| Catégorie | Proposition à approuver | État technique |
|---|---|---|
| Compte et contenus de livret | Contrat actif, puis restitution sur demande et délai de clôture choisi par l’éditeur | Archivage et suppression logement existants ; pas d’effacement global démontré |
| Messages/retours/demandes | Durée utile au séjour et traitement du service, fixée avec le gestionnaire | Token de conversation 30 jours ; ce n’est pas une purge des messages |
| Comptabilité et preuves financières | Conservation séparée selon obligations applicables ; ne pas étendre aux messages | Ledger indépendant conservé ; ne pas lancer d’effacement automatique |
| Logs sécurité et incidents | Durée courte proportionnée au besoin, à confirmer avec les possibilités de l’hébergeur | Pas de conservation illimitée annoncée ; événements minimisés |
| Sauvegardes hors hébergeur | Proposition initiale 7 jours, mêmes protections et limitation des accès | Retention TEST effective 7 jours ; commercial à autoriser |
| Copies hors ligne | Jusqu’à retrait par utilisateur ou effacement du navigateur | Appareil du voyageur, pas une sauvegarde serveur |

Pas de programme de suppression nouveau dans ce lot. Une politique juridiquement validée doit refléter les mécanismes réellement disponibles ; ne pas publier une promesse de purge automatisée absente.

## Contrat SaaS et prestations du premier vendeur

Les quatre brouillons français existants restent la base. Fixer avant publication : affichage fiscal des 9,99 €/mois pour deux logements et 2,99 €/logement supplémentaire, résiliation en fin de période déjà configurée au portail, politique de remboursement d’abonnement, devenir du guide à résiliation, contacts droits/réclamation et publics admis. Commission 2 % séparée des frais Stripe et de l’abonnement.

Avant chaque prestation payante, le gestionnaire fournit son identité de vendeur, description, prix total, date/conditions d’exécution, annulation et remboursement, information sur la rétractation ou exemption applicable et médiation lorsque requise. Utiliser les emplacements existants du guide/service ; ne pas inventer une règle uniforme pour transport, petit-déjeuner, ménage ou activité. Le vendeur accepte personnellement ses engagements Stripe et les conditions Nona de commission. L’éditeur approuve les textes et versions contractuelles ; l’agent les intègre ensuite sans changement UX de cette passe.

Sources officielles consultées : https://lovable.dev/data-processing-agreement ; https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre4#Article28 . Préparation technique et projet de clauses, pas déclaration de conformité ni acceptation.
