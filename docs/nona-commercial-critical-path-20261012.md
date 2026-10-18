# Nona — offre complète, passage commercial

Décision définitive du 12 octobre 2026 : livrets, abonnements 9,99 € pour deux logements puis +2,99 €, services voyageurs payants Connect et commission Nona de 2 % dès la V1. La proposition antérieure de reporter les services est annulée. Aucun paiement ni écran n'est désactivé.

## Travail exécuté dans cette passe

- HEAD initial distant relu : 0261d88a6e4463d26e0725b6cfeaff57032782e2 ; Lovable confirme le même commit et un agent arrêté/ready. Le projet est déjà marqué publié, mais aucune publication nouvelle n'est faite et le connecteur ne fournit pas son URL commerciale. Aucun crédit génératif utilisé.
- Sonde HTTP indépendante du backend et du fournisseur : GET borné, origine explicitement autorisée, pas de redirection, pas de query/identifiants ; réponse minimisée. Quatre tests d'intégration HTTP locaux PASS : vrai HTML de build, erreur 503, accès 401/403, quota 429, redirection, route absente, page de connexion et refus des configurations non autorisées. Sorties sans body, URL, header ni exception. Les échecs d'accès ne sont pas des preuves de panne.
- Lecture réelle de la preview actuelle : HTTP 403, état RESTRICTED, le 12 octobre à 10:31:58 UTC. Pas de HEAD servi vérifié ni de surveillance publique activée. Aucun accès direct aux tables de la source.
- Préflight de configuration de lancement : cinq tests Node PASS. Validation hors ligne des cibles client/serveur, origine HTTPS commune, secrets serveur requis, clé Live de préparation, deux webhooks distincts, prix distincts, secret de scheduler, absence de secret VITE et maintien de STRIPE_LIVE_VERIFIED=false. Pas d'appel Stripe, aucune activation. INPUTS_PREPARED ne signifie pas GO : existence et mode des prix, capacités, délivrance des webhooks et conformité sont des preuves séparées.
- Défaut de préparation corrigé : .env.example omettait SUPABASE_SERVICE_ROLE_KEY pourtant requis par client.server.ts, HOSTBUDDY_CONNECT_APP_URL et BILLING_SYNC_SECRET. Champs vides/placeholder ajoutés ; aucun secret enregistré. La consigne du flag Live est clarifiée sans le changer dans aucun environnement.
- Modèle DB/Auth complété : clients PostgreSQL 17 depuis le dépôt officiel PGDG installés avant chargement des entrées privées ; vérification de l'archive après récupération depuis GitHub. YAML et ordre des étapes contrôlés. Modèle toujours hors .github/workflows ; aucun nouveau job planifié ou secret enregistré. Les anciens huit tests de backup ne sont pas relancés ; ils restent acquis. L'export, la récupération réelle et la cadence de ce nouveau DB/Auth demeurent non exécutés.
- Tableau de bord Supabase TEST : session expirée, connexion demandée. Lovable : You don't have access, connexion demandée. Aucun mot de passe réinitialisé, rôle créé, condition contractuelle acceptée ou secret transmis. Les accès HTTP TEST existants ne remplacent pas une connexion PostgreSQL.

Les acquis cœur, Billing 7/7, Connect TEST, restauration/147 permissions, mobile 23/23, WebKit 7/7 et performance sont conservés sans retest. Checkout partagé avec changements préexistants préservé. Aucun code du moteur financier modifié.

## Connect : parcours réel retenu, sans reprendre le sandbox bloqué

Le code existant crée un compte Accounts v2 avec dashboard full, merchant/card_payments, frais et pertes du compte connecté attribués à Stripe. Il utilise un Checkout direct avec stripeAccount propre au gestionnaire et application_fee_amount calculé par le moteur acquis. La documentation Stripe confirme ce modèle SaaS et le parcours hébergé à faible effort. Pas de passage à Express, de comptes fictifs Live ou de nouvel écran KYC.

1. **Plateforme Nona** : le titulaire active son propre compte plateforme Live et Connect après validation Stripe. Ses accords, coordonnées bancaires et vérifications lui appartiennent. Aucune action Live ici. Les capacités d'un gestionnaire ne remplacent pas l'activation de Nona.
2. **Premier gestionnaire légitime** : utiliser une nouvelle organisation commerciale owner et son propre compte connecté Live ; ne pas réemployer un acct_ du sandbox, un cus_/price_/webhook TEST ou un paiement historique TEST. Il choisit son pays réel et accepte lui-même les conditions Nona/commission avant le lien hébergé Stripe. Le titulaire ne remplit pas les pièces d'identité d'un autre vendeur et Nona ne les recueille pas dans son application.
3. **KYC gestionnaire** : le gestionnaire complète son entreprise, représentant, identité, banque et engagements directement chez Stripe, dans un navigateur ordinaire. Stripe peut demander des compléments ou différer sa décision ; ni connexion réussie, ni return_url ne prouve l'activation. Un compte Stripe existant ne garantit pas automatiquement l'éligibilité Connect.
4. **Après retour** : les fonctions existantes relisent configuration.merchant et requirements. Avant encaissement, card_payments.status doit être active. Avant d'annoncer les virements disponibles, stripe_balance.payouts.status doit être active et les exigences pertinentes résolues. Ce sont des capacités distinctes. Conserver le renouvellement du lien pour le même compte/tenant ; aucune boucle sur le sandbox initial.
5. **Première vente autorisée** : le client règle une véritable prestation du gestionnaire, via le Checkout de ce compte. Vérifier lecture seule : mode Live de la session/PaymentIntent/événement, bon tenant et vendeur, montant/devise, commission arrondie à 2 %, webhook réellement livré, commande payée une seule fois et données visibles au bon gestionnaire. Examiner les traces et la première application_fee réelle ; ne pas fabriquer une petite transaction Live pour simuler un test. Toute transaction, facture ou remboursement reste sous autorisation et consentement de son acteur, avec frais Stripe réels à considérer.

La carte 4242 ne doit pas être utilisée en Live. Le moteur TEST acquis n'est pas retesté. Avant la première vente : contrôles de configuration/capacités et délivrance d'un événement de diagnostic autorisé dans le mode approprié ; après la première vente légitime : réconciliation minimale ci-dessus. Pas de charge ni remboursement réel exécuté dans cette passe.

## Ordre de préparation technique

**Exploitation TEST d'abord** : reconnecter Supabase dans le navigateur sécurisé et récupérer la connexion SQL existante + CA, sans secret dans le chat. Le job déjà préparé exporte public/Auth/Storage de la base ; les octets des médias restent dans le job distinct. Réutiliser la clé de chiffrement privée existante et le dépôt privé NONA-OPS. Vérifier quota et protection des dépenses avant activation. Installer uniquement le workflow DB/Auth adapté après entrées disponibles, prouver une capture/récupération puis un cycle planifié ; les alertes GitHub existantes couvrent l'échec du job, pas un job absent. Réutiliser le contrôle de fraîcheur existant ; ne pas lancer une autre série d'audits.

**Hébergement actuel avant migration** : préférer Lovable déjà connecté au code, sans envoyer de prompt génératif. Reconnexion de l'éditeur pour consulter l'URL publiée, runtime/bindings, logs et réglages Auth/domaines. Lire plan/quota/coûts ; aucun abonnement ni domaine acheté. Ne pas confondre commit annoncé et build servi : utiliser marqueur Git propre, ou empreinte source déjà existante si builder sans Git. La sonde HTTP doit viser une route publique de cette version, pas la preview protégée. Si le fournisseur demeure inaccessible, documenter ce seul accès manquant avant de proposer un nouvel hébergeur ; aucun essai Vercel répété.

**Configuration préparée, pas appliquée** : même backend explicite client/serveur ; clé service exclusivement serveur ; origine HTTPS canonique ; Auth site URL et redirections de login/reset sur cette origine ; Google seulement si configuré ; e-mails d'inscription/récupération et support avec expéditeur opérationnel, sans envoi à de vrais destinataires dans cette passe. Clés Stripe Live propres au runtime, deux signatures webhook Live distinctes, prix mensuels Live EUR 999/299 centimes et quantités existantes, URLs publiques Stripe sans mur d'accès, scheduler billing-sync avec secret distinct. Le runner TEST utilise le header x-hostbuddy-billing-mode:test ; il ne doit pas être copié comme tel dans un runner Live. Pas de contournement du handler et pas de changement du moteur acquis.

**Séparation des données** : conserver toutes les fixtures existantes. Ne pas convertir les organisations/accounts TEST en comptes commerciaux. Préparer un inventaire de déploiement sans secrets et sans copier d'anciens identifiants financiers dans un environnement Live. Le choix du backend commercial et ses droits doivent être approuvés lors de la mise en production ; la cible recovery TEST mhhtnqfdkyudwyqlmnce est exclue par le préflight.

**Collecte des erreurs** : réutiliser hostbuddy.operations.v1 et le relais minimisé existant. Depuis les logs hébergés autorisés, transmettre uniquement nom d'événement fixe, niveau, date et compteur. Aucune exception/route/message client. Raccorder au canal GitHub déjà autorisé ; prouver une réception de signal inoffensif provenant du runtime choisi, pas seulement du récepteur local. Conserver les preuves acquises de notifications GitHub ; aucune nouvelle réception de signal hébergé affirmée ici.

## Textes et responsabilités, offre complète

Éditeur déjà identifié : Tristan Penalba EI, SIREN/SIRET connus ; tarifs déjà actés. Ne pas demander une nouvelle identité ni changer les 2 %. Actualité de l'adresse/contact et régime TVA à confirmer. La commission prélevée par le code est 2 % du total, avec arrondi au centime ; sa présentation fiscale doit être cohérente, pas transformée arbitrairement en 2 % HT + TVA.

Réutiliser /legal, les CGV et l'annexe de traitement préparées. À finaliser avant leur intégration : identité contractuelle de l'hébergeur réellement choisi, DPA et sous-traitants/transferts, conservation/effacement/export opérationnels, risque de marque Nona identifié. Les faits non publics et les engagements du titulaire ne peuvent pas être certifiés par l'agent.

**Pour les services voyageurs**, le vendeur est le gestionnaire professionnel correspondant au compte connecté. Il doit fournir identité/contact, description de prestation et prix, conditions d'exécution/annulation, réclamations et droits consommateur applicables. Préparer ces contenus dans les fiches et emplacements existants, puis leur présence avant l'engagement payant ; information RGPD propre à l'établissement avant collecte message/service/retour. Les conditions Nona globales et le KYC Stripe ne remplacent pas ces informations. Qualification de la rétractation/exception selon chaque prestation, médiation si applicable et preuve d'acceptation sont à approuver juridiquement ; aucune garantie de conformité déduite des seuls formulaires. Pas de nouvelle fonctionnalité construite ni de notice fictive publiée.

## Cinq obstacles, actions minimales

| Obstacle | Ce que l'agent termine avec les accès | Intervention impérative |
| --- | --- | --- |
| 1. Export DB/Auth récurrent non exécuté | Activer et vérifier le job privé préparé, réunir preuves DB et médias | Connexion Supabase TEST et entrée SQL existante/CA via canal sécurisé ; pas de mot de passe ici |
| 2. Runtime commercial/Auth/HTTP/logs non raccordés | Configurer et vérifier les préparatifs, recevoir l'alerte hébergée, prouver le build/origine | Reconnecter Lovable avec droits au projet, approuver domaine/origine et ensuite publication/production ; dépenses éventuelles à approuver séparément |
| 3. Plateforme Nona Live non activée | Préparer prix, signatures, destinations et préflight, contrôler métadonnées après autorisation | Titulaire active et vérifie son compte Stripe/Connect, accepte ses propres engagements ; autorisation Live finale distincte |
| 4. Premier vendeur Live non vérifié | Accompagner le parcours existant et relire les capacités puis la première vente autorisée | Un gestionnaire légitime réalise personnellement son KYC/banque/accords ; Stripe décide ; l'achat réel appartient au client |
| 5. Documents/conditions complets non approuvés | Finaliser les éléments techniques et intégrer les textes validés dans les emplacements existants | Confirmer coordonnées/TVA ; approuver conditions SaaS et services/vendeur/RGPD, conservation et risque de marque avec compétence juridique appropriée |

## Passage direct UX/DA puis lancement

Le prochain lot UX/DA utilise la maquette validée, grille mobile deux colonnes et Services pleine largeur, sans toucher aux flux financiers. Il commence dès que les accès/configurations et textes de ces cinq obstacles sont préparés, pendant les vérifications humaines Stripe si possible. Aucune nouvelle fonctionnalité ou refonte technique. Avant autorisation de lancement : publier la version approuvée, contrôle ciblé du déploiement/Auth/webhooks/alertes et essai court sur téléphone. Les anciennes recettes complètes ne sont pas recommencées. Après ouverture, réconcilier la première vente légitime et le premier abonnement autorisé.

**Verdict : préparation avancée, aucun GO commercial ou activation Live.** Aucun grand audit nouveau, retest acquis, transaction, condition acceptée, production, merge main, donnée supprimée ou secret exposé. Les seuls nouveaux tests concernent les outils de préparation ci-dessus.

## Sources primaires vérifiées le 12 octobre

- Stripe Accounts v2 : https://docs.stripe.com/connect/accounts-v2/connected-account-configuration
- Onboarding hébergé : https://docs.stripe.com/connect/saas/tasks/onboard
- Paiements directs Checkout : https://docs.stripe.com/connect/saas/tasks/accept-payment
- Application fees : https://docs.stripe.com/connect/saas/tasks/app-fees
- PostgreSQL Ubuntu/PGDG : https://www.postgresql.org/download/linux/ubuntu/
- CNIL contrat responsable/sous-traitant : https://www.cnil.fr/fr/node/278

Le contenu de cette procédure est une préparation technique et contractuelle à examiner ; aucune certification juridique ou approbation Stripe garantie.
