# Nona — audit juridique avant lancement

9 octobre 2026. Reprise des informations de l’éditeur sur la base `002d072a639e124da8c7619d3f888efa4e2adb53`, branche `feat/guest-guide-v2-lot1`. Les constats fonctionnels antérieurs sont conservés sans réexécuter Billing ni Stripe.

**État : textes corrigés et dossier de finalisation préparé ; publication définitive bloquée par les informations et décisions ci-dessous.** Les documents de `/legal` restent des versions de travail françaises, avec avertissement et `noindex`. Ce dernier limite l’indexation, pas l’accès public. Aucun contrat, accord de sous-traitance ou accord Stripe n’a été accepté dans ce chantier.

Nona est le nom commercial retenu pour l’application anciennement HostBuddy. **L’éditeur identifié par le titulaire est Tristan Penalba, entrepreneur individuel (EI), SIREN 992856641, SIRET 99285664100012.** Cette identification ne confirme pas la disponibilité de marque. Une organisation cliente de conciergerie et son compte Stripe ne sont pas l’éditeur du logiciel.

## Corrections réalisées

| Point                 | Preuve / constat                                                                           | Correction                                                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nom                   | Décision explicite du titulaire                                                            | Nona dans les textes et le titre de `/legal` ; distinction avec l’éditeur et les droits de marque. Pas de refonte ni renommage technique global                                                         |
| Prix                  | `payment-policy.ts` : 999 et 299 centimes, un logement gratuit                             | 9,99 €/mois pour deux logements ; +2,99 € par logement supplémentaire. TVA/HT/TTC ouverts                                                                                                               |
| Décompte et évolution | `payments.server.ts`, `billing-sync.ts`, `0022_paid_billing_capacity.sql`                  | Brouillons/publiés comptés, archivés exclus ; augmentation au prorata au-delà de la capacité payée, baisse au renouvellement sans crédit automatique ; retour à un logement programmé en fin de période |
| Résiliation           | `startPortal` : `subscription_cancel.mode=at_period_end`                                   | Fin de période indiquée dans le brouillon ; pas de politique de remboursement d’abonnement inventée                                                                                                     |
| Commission            | `serviceFeeCents`, Checkout direct sur le compte connecté                                  | 2 % du total, arrondi au centime par commande, retenu sur l’encaissement ; pas de supplément facturé automatiquement au voyageur                                                                        |
| Remboursement         | `refundOrderPayment` : remboursement intégral, `refund_application_fee=true`               | Fonction actuelle décrite ; remboursement des frais Stripe non promis ; remboursement partiel non revendiqué comme action disponible                                                                    |
| Rôles RGPD            | Données voyageurs gérées par organisation ; exploitant parfois distinct de la conciergerie | Responsable à identifier selon le contrat, Nona sous-traitant dans le périmètre convenu ; fonctions propres de l’éditeur distinguées                                                                    |
| Google                | `__root.tsx` charge `fonts.googleapis.com`/`fonts.gstatic.com` ; OAuth optionnel           | Google Fonts ajouté, indépendamment de la connexion Google ; transferts à qualifier                                                                                                                     |
| Sécurité              | Endpoints publics hachent IP + navigateur + guide                                          | Empreinte qualifiée de pseudonymisée, pas d’anonyme                                                                                                                                                     |
| Données formulaires   | `GuestActions.tsx`, endpoints messages/orders/feedback                                     | Nom requis pour messages/demandes, contact facultatif ; note requise et nom/commentaire facultatifs pour retours privés                                                                                 |
| Suppression           | `0021_property_deletion.sql` et `property-deletion.server.ts`                              | Suppression du logement distinguée de l’archivage et de l’effacement de compte ; médias peuvent rester en attente ; registre financier préservé                                                         |
| Appareil              | `GuestActions.tsx`, `i18n.tsx`, `GuideView.tsx`, `offline/store.ts`                        | Favoris ajoutés ; stockage local, expiration de conversation et suppression réelle distingués                                                                                                           |

Aucun changement du moteur Billing, des paiements, des tarifs calculés, du schéma, des webhooks ou du rattachement Connect. Aucune transaction ni vérification Stripe. Le statut externe Stripe reste inchangé.

## Recherche d’informations professionnelles

Les anciens documents ont été retrouvés et leurs en-têtes lus : `Devis_Primo_Conciergerie_24_06_2026.pdf` et `Facture_Primo_Conciergerie_Final_1400EUR.pdf`, datés du 24 juin 2026. Ils identifient Tristan Penalba comme **prestataire entrepreneur individuel**, avec le SIRET 99285664100012 ; la conciergerie est le **client**. Le titulaire confirme aujourd’hui cette identité comme celle de l’éditeur Nona. Les coordonnées complètes historiques sont reprises dans le dossier privé de vérification ; elles ne sont pas exposées dans ce dépôt public en attendant confirmation de leur actualité.

L’API publique officielle de recherche d’entreprises a été interrogée directement le 9 octobre 2026 avec le SIREN exact, réponse HTTP 200, un résultat. Un extrait limité aux données nécessaires est conservé dans `docs/nona-publisher-verification-2026-10-09.json`.

| Information                     | Résultat / provenance                                                                                         | Utilisation dans les documents                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Nom de l’éditeur                | Tristan Penalba, documents historiques et confirmation explicite du titulaire ; nom non diffusible dans l’API | Éditeur et directeur de publication renseignés ; ne pas attribuer la confirmation du nom au registre public |
| SIREN / SIRET du siège          | 992856641 / 99285664100012, correspondance officielle exacte                                                  | Renseignés dans les mentions et l’annexe RGPD                                                               |
| Forme / activité administrative | Nature juridique 1000, `est_entrepreneur_individuel=true`, unité et siège en état A, un établissement ouvert  | Entreprise individuelle active ; ni capital social fictif ni qualité de société ajoutés                     |
| Commune / création              | Nice ; création le 17 octobre 2025                                                                            | Faits officiels vérifiés ; pas de confusion avec une conciergerie cliente                                   |
| Adresse détaillée               | Non diffusible dans la réponse publique ; adresse historique disponible dans les pièces                       | Actualité à confirmer, pas de reconstitution de donnée masquée                                              |
| E-mail / téléphone              | Disponibles dans les pièces historiques, pas de confirmation d’actualité officielle                           | Proposition prête dans le dossier privé, à confirmer avant utilisation publique                             |
| TVA                             | Documents de juin 2026 : article 293 B du CGI ; champ API `tva=null`                                          | Régime historique établi, régime actuel non démontré ; `null` n’est pas une attestation de franchise        |
| APE                             | 59.12Z, post-production de films/vidéo                                                                        | Valeur statistique uniquement ; pas de conclusion que Nona est interdit ni de modification automatique      |

La non-diffusion du nom et de l’adresse n’empêche pas leur obligation d’information sur le futur site professionnel. Elle limite seulement cette vérification publique. La direction de publication est renseignée au nom de la personne physique éditrice, conformément à l’article 93-2 de la loi du 29 juillet 1982. Une recherche homonyme n’a pas servi à compléter l’identité.

L’APE observé diffère de l’activité de logiciel Nona. Selon l’Insee, le code APE n’a pas de valeur juridique et ne décrit pas nécessairement toutes les activités exercées. La déclaration des activités au RNE doit être contrôlée dans l’extrait détenu par l’entrepreneur avant commercialisation ; la réponse publique ne permet pas de conclure qu’une adjonction d’activité est nécessaire. Aucun changement de registre demandé ou effectué.

### Fiscalité et tarifs déjà actés

Les montants restent : un logement gratuit sans carte, 9,99 €/mois pour deux logements, +2,99 €/mois par logement supplémentaire ; commission de 2 % du total de la commande, arrondie au centime et retenue sur l’encaissement. Le périmètre de préparation contractuelle reste celui des gestionnaires professionnels. Ces décisions ne sont pas redemandées.

Si le maintien de la franchise en base est confirmé, la mention préparée est « TVA non applicable, article 293 B du CGI » pour les prestations qui en relèvent : aucune TVA supplémentaire à inventer sur les prix actés ou la commission. Si le régime a changé ou si une option pour la TVA a été exercée, adapter les mentions et la ventilation fiscale avec le comptable/SIE avant commercialisation ; ne pas transformer les 2 % en « 2 % HT + TVA » par simple rédaction. Le registre public et un ancien document ne permettent pas de trancher ce choix fiscal non public.

### Nom Nona : point de vigilance concret

Le site https://www.nona.fr/ présente déjà un logiciel professionnel de gestion des cuisines. https://www.thenona.co/legal/mentions-legales concerne un autre service. Ces usages vérifiables ne constituent pas une décision juridique sur la possibilité d’exploiter le nom choisi. Ils justifient une recherche d’antériorités France/UE (signes identiques et similaires, produits/services et noms commerciaux) et une interprétation par un conseil en propriété industrielle ou juriste. Aucune commande payante, dépôt, domaine acheté ou certitude de disponibilité dans ce lot. Classes 9 et 42 à examiner pour le logiciel/SaaS, et autres classes selon les activités réellement proposées ; la classe seule ne tranche pas le risque de confusion.

## Inventaire des stockages et flux observés

Inventaire source, à confronter au domaine commercial réel avant lancement. Aucun bandeau de consentement fictif ajouté.

| Stockage / flux                                                            | Déclenchement / finalité                                         | Durée constatée / limite                                                                                                                      |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Session Supabase, stockage local ou relais preview                         | Connexion gestionnaire, persistance et renouvellement de session | Pas de TTL local Nona fixé ; durée de session serveur et paramètres auth à relever ; suppression lors de déconnexion/effacement du navigateur |
| `hostbuddy.locale`, local/sessionStorage                                   | Préférence de langue                                             | Session du navigateur pour sessionStorage ; pas de TTL explicite pour localStorage                                                            |
| `hostbuddy.guest-thread.<slug>`, localStorage                              | Retrouver une conversation demandée                              | Accès serveur 30 jours à compter de création ; copie locale sans TTL ; messages non purgés par expiration                                     |
| `hostbuddy.saved-place.*`, localStorage                                    | Favoris demandés par le visiteur                                 | Pas de TTL explicite ; changement de préférence/effacement navigateur                                                                         |
| `hostbuddy-guest-offline-v1`, IndexedDB ; `hb-guest-shell-*`, CacheStorage | Enregistrement volontaire d’un guide et des médias               | Pas d’expiration périodique ; suppression manuelle/remplacement/éviction navigateur ; pas de révocation distante garantie                     |
| Stockage de démonstration, sessionStorage                                  | Démonstration et édition locale fictive                          | Session ; distinct des données de conciergerie                                                                                                |
| Composant `sidebar_state`                                                  | Composant générique présent, aucun import actif retrouvé         | Ne pas le déclarer déposé sur cette seule présence source ; vérifier si activé ultérieurement                                                 |
| Google Fonts                                                               | Polices depuis les pages, avant toute connexion Google           | Requêtes externes effectives dans le code ; traitement de données et garanties à qualifier, même sans preuve de cookie publicitaire           |
| Google OAuth / Stripe hébergé                                              | Choix de connexion ou paiement                                   | Inventaire des pages tiers et contrats distincts                                                                                              |
| Télémétrie Lovable                                                         | Hooks de reporting preview, infrastructure du fournisseur        | Ne pas l’assimiler à une audience publicitaire Nona ni présumer son absence sur le domaine définitif ; paramètres et durée à relever          |
| Liens Maps/WhatsApp/avis                                                   | Navigation externe demandée                                      | Aucun iframe de ces services établi dans les vues examinées ; traitements après navigation à distinguer                                       |

L’exemption de consentement des stockages nécessaires au service demandé est à documenter. Elle n’exempte pas l’information RGPD. Un éventuel traceur non exempté exige un choix préalable effectif et révocable ; une simple page cookies ne suffit pas.

## Conservation et opérations RGPD à terminer

| Catégorie                           | Constat actuel                                                                                    | Décision / preuve indispensable                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Comptes, membres, invitations       | Fonctionnels ; procédure complète de clôture/effacement non démontrée par la suppression logement | Critères de conservation, retrait d’accès, export et effacement                                                     |
| Guides, médias, provenance d’import | Suppression du logement possible ; nettoyage média distinct                                       | Durée après fin du contrat, gestion des erreurs/orphelins, copies téléchargées                                      |
| Conversations et retours            | Accès conversation 30 jours ; pas de purge globale établie dans le périmètre audité               | Instructions de l’exploitant, délai maximum, purge et exceptions contentieuses                                      |
| Demandes et paiements               | Commandes liées effacées avec logement ; registre financier préservé                              | Séparer données opérationnelles et preuves nécessaires ; droit fiscal et obligations de chaque vendeur              |
| Pièces comptables françaises        | Obligation de conservation, sans architecture d’archivage validée ici                             | Conservation dix ans à compter de la clôture de l’exercice applicable, accès restreint et périmètre réel des pièces |
| Empreintes anti-abus et journaux    | Fenêtres de limitation ; pas de durée de purge établie                                            | Durée justifiée, purge et mise en balance de l’intérêt légitime                                                     |
| Sauvegardes                         | Prestataires et cycle non vérifiés                                                                | Région, rétention, disparition des données supprimées, gestion des restaurations                                    |

Le projet d’annexe `docs/nona-data-processing-draft.md` prépare les catégories, opérations, responsabilités, mesures et prestataires. Il reste à contractualiser et à rendre opérantes ses procédures. Les prestataires ne sont pas tous de simples sous-traitants : Stripe précise des rôles variables par traitement. Le SDK Supabase ne prouve pas un contrat direct Supabase du titulaire si le service est fourni par Lovable Cloud.

Lecture gratuite de la région du backend existant : Lovable → More → Cloud → Overview → Advanced settings → Database location. Le pays d’une base ne démontre pas la localisation exclusive du CDN, support, journaux ou polices. Les pages publiques DPA Lovable identifient des entités différentes selon les dispositions ; ne pas choisir une entité légale d’hébergeur par déduction. Obtenir le contrat/facture du service commercial et sa fiche d’hébergement.

## Relation gestionnaire / voyageur : limites à résoudre avant ouverture payante

1. **Information à la collecte** : les formulaires publics de message/service/retour examinés n’offrent pas la notice complète et propre à l’établissement. La page Nona ne peut pas remplacer l’identité, les finalités et le contact du responsable de chaque guide. Préparer une notice courte avant collecte et son détail accessible ; ne pas masquer l’absence actuelle par une affirmation de conformité.
2. **Vendeur de la prestation** : recueillir l’identité professionnelle du vendeur réel, prix TTC éventuel, exécution, annulation, rétractation/exception applicable, réclamations et médiateur si requis avant l’engagement payant. La demande de service est présentée comme demande, pas comme vente déjà conclue.
3. **Droits consommateurs** : le périmètre SaaS B2B éventuel ne retire pas les protections du voyageur consommateur. Les exceptions de services à date précise ne couvrent pas automatiquement tous les services. La source officielle CGV indique l’obligation, depuis le 19 juin 2026, d’une fonctionnalité de rétractation en ligne pour les contrats concernés ; à qualifier par le juriste selon les offres. Ne pas confondre avec résiliation ou remboursement.
4. **Acceptation / preuve** : la page `/legal` ne recueille aucune acceptation. La case de commission avec version/date existante n’est pas une acceptation démontrée de toutes les CGV ou de l’accord article 28. Fixer document, version, accès avant engagement et preuve applicable, sans accepter ni activer quoi que ce soit dans ce lot.
5. **Commission / fiscalité** : valider si les 2 % sont un montant TVA incluse ou une assiette HT. Le code retient seulement 2 % du total ; écrire « 2 % HT + TVA » sans changement cohérent de l’offre créerait un écart. Clarifier facturation de la commission, identité du vendeur et éventuel rôle d’intermédiaire de Nona.
6. **Sort du service** : fixer export, fermeture et accès au premier guide gratuit après arrêt de l’abonnement ; ne pas prétendre que le portail décide à lui seul de tous ces droits.

Ces points sont identifiés et préparés, pas déclarés conformes par le seul enrichissement des pages. Aucun parcours produit refondu dans ce lot ; intégration des notices et versions approuvées à prévoir une fois les informations déterminées.

## Seules confirmations actuelles indispensables au titulaire

1. **Actualité des coordonnées déjà retrouvées** : l’adresse, l’e-mail et le téléphone historiques peuvent-ils être utilisés dans les documents Nona, l’e-mail servant aussi aux demandes RGPD ? Si tout est inchangé, une confirmation suffit ; sinon fournir uniquement les éléments modifiés. Les valeurs sont proposées dans le dossier privé, sans demander de ressaisir l’identité ou les identifiants.
2. **Maintien du régime fiscal** : la franchise en base de TVA mentionnée en juin 2026 est-elle toujours applicable, sans changement ni option pour la TVA ? Si non, faire confirmer le régime et la présentation fiscale par le comptable/SIE. Aucun chiffre d’affaires, justificatif d’identité ou document fiscal complet demandé pour cette reprise.

L’hébergement contractuel, les durées/procédures, les notices voyageurs et les modalités contractuelles non encore validées restent des travaux de finalisation documentés, pas un nouveau questionnaire au titulaire. Leur absence de preuve est conservée ; elle n’est pas remplacée par une promesse fictive. L’identité, le statut, le SIREN/SIRET, le nom commercial, la cible gestionnaires professionnels et les tarifs disponibles ne sont plus demandés.

## À faire examiner par un juriste

- Antériorités Nona et périmètre de protection.
- CGV SaaS : client professionnel/non-professionnel, protections impératives, résiliation, pénalités éventuelles, remboursements, limites de responsabilité, export et litiges.
- Services voyageurs : vendeur ou mandataire/intermédiaire, information et preuve du contrat, rétractation/exceptions, médiation et obligations éventuelles de plateforme.
- TVA et pièces de commission (avec comptable), sans modifier les calculs validés.
- Répartition exploitant/conciergerie/Nona, accord article 28, sous-traitants ultérieurs, transferts et conservation.
- Google Fonts distant : base légale/transferts et option d’hébergement local des mêmes polices à considérer si nécessaire. Aucun changement graphique effectué.

## Validation technique de ce lot

Contrôles exécutés avec succès pour cette reprise : ESLint ciblé sur `src/lib/legal-content.ts`, `npm run typecheck`, `npm run build` et `git diff --check`. Les sources de `/legal` conservent l’avertissement de brouillon et `noindex`. Le build présente les avertissements de dépréciation déjà connus, sans erreur bloquante. Aucun test financier ni appel Lovable génératif. Les validations antérieures Billing/Connect sont conservées sans réexécution. Pas de publication production ni merge main.

## Sources officielles et sources primaires

Consultées le 9 octobre 2026 :

- Identification et CGV : https://entreprendre.service-public.gouv.fr/vosdroits/F31228 ; https://entreprendre.service-public.gouv.fr/vosdroits/F37351 ; https://entreprendre.service-public.gouv.fr/vosdroits/F33527 ; https://entreprendre.service-public.gouv.fr/vosdroits/F23455
- Médiation : https://entreprendre.service-public.gouv.fr/vosdroits/F33338
- Nom commercial et antériorités : https://www.inpi.fr/disponibilite-dune-marque-dun-logo-dun-nom-de-societe-dun-nom-de-domaine ; https://www.inpi.fr/realiser-demarches/propriete-intellectuelle/conditions-de-validite-dune-marque
- Entreprise exacte, réponse API officielle : https://recherche-entreprises.api.gouv.fr/search?q=992856641 ; extrait de réponse dans `docs/nona-publisher-verification-2026-10-09.json`
- Non-diffusion / extrait RNE : https://www.service-public.gouv.fr/particuliers/vosdroits/R60912 ; https://entreprendre.service-public.gouv.fr/vosdroits/R19859
- Directeur de publication personne physique : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033971722/2024-04-14
- APE et valeur statistique : https://www.insee.fr/fr/metadonnees/nafr2/sousClasse/59.12Z ; https://www.insee.fr/fr/information/6790269?question=quelle-est-la-valeur-legale-d-un-code-ape
- Franchise de TVA / option : https://www.impots.gouv.fr/professionnel/les-regimes-dimposition-la-tva ; https://bofip.impots.gouv.fr/bofip/1079-PGP.html/identifiant%3DBOI-TVA-DECLA-40-10-20-20260701
- Usage Nona constaté (pas conclusion de droit) : https://www.nona.fr/ ; https://www.thenona.co/legal/mentions-legales
- RGPD information : https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre3
- Sous-traitance : https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre4 ; https://www.cnil.fr/fr/clauses-contractuelles-types-entre-responsable-de-traitement-et-sous-traitant
- Conservation : https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees
- Cookies : https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/comment-mettre-mon-site-web-en-conformite
- Prestataires / régions : https://docs.lovable.dev/features/cloud ; https://lovable.dev/fr/data-processing-agreement ; https://supabase.com/docs/guides/platform/regions ; https://stripe.com/fr/privacy
