# Nona — alertes et sauvegardes complémentaires, 9 octobre 2026

Base : `64b703c5b5e53ad1b772141c69f2c7ceef44ab2b`. La reprise DB/Auth/Storage et les 147 validations de permissions restent acquises. Aucun nouvel audit financier ou de permissions. Aucun changement applicatif, source, Stripe, Billing, production, merge main ou prompt Lovable.

## Ce qui est terminé et prouvé

### Sauvegarde complémentaire réelle, TEST uniquement

`scripts/ops/storage-backup.py` lit exclusivement `mhhtnqfdkyudwyqlmnce`. Toute autre référence, notamment la source, est refusée avant appel réseau. Aucun endpoint de mutation : seuls GET buckets/Auth settings/objets et POST de listing Storage sont permis. Les redirections HTTP sont refusées pour ne pas transmettre la clé à un autre hôte. Les clés sont lues dans des fichiers privés, jamais dans les arguments ou résultats de tests.

Exécution réelle sur la cible : **12 objets, 4 352 466 octets**, soit les 9 médias restaurés et les 3 fichiers synthétiques de la recette précédente. Les deux buckets et leurs réglages, les métadonnées/chemins, les réglages Auth publics accessibles par API et une description de configuration observée sont inclus dans l'archive. L'inventaire, les buckets et les réglages Auth sont relus après téléchargement : la capture échoue si ces données changent entre les deux observations. Ce contrôle n'est pas un snapshot transactionnel PostgreSQL.

Archive ZIP chiffrée en **AES-256-GCM**, nonce aléatoire de 12 octets, format/version authentifiés. SHA-256 de chaque objet enregistré à l'intérieur du manifeste chiffré. Le bundle en mémoire est déchiffré et vérifié avant écriture atomique sur un nouveau fichier privé ; une **seconde relecture du fichier écrit** vérifie authentification, nombre, tailles et empreintes de tous les objets. Ni secrets ni contenu client ne sont publiés dans le dépôt ou les preuves. Aucun ancien bundle/clé remplacé ou publié.

Durée de cette capture : **339,62 secondes**. Cette mesure couvre lecture réseau, inventaires, chiffrement et contrôle local ; elle ne constitue pas un RTO de restauration complète. Les chemins d'objets restent uniquement dans le bundle chiffré. Résultats anonymisés : `docs/evidence/nona-ops-test-20261009.json`.

**Limites explicites :** complément au backup PostgreSQL, pas export de la base ni des credentials Auth. Les réglages du tableau de bord inclus proviennent d'observations opérateur identifiées ; ce n'est pas un export automatique exhaustif de Supabase Management. Secrets de fournisseurs/API, SMTP, Vault et signatures JWT non exportés. Le hook bloquant les e-mails TEST est décrit, pas supprimé. Aucun relais, job ou fonction financière réactivé.

### Relais d'alerte : transport local réellement vérifié

Les événements structurés applicatifs existent déjà. `scripts/ops/forward-alert.py` est un outil d'exploitation séparé ; le code applicatif et ses logs ne changent pas. Il accepte uniquement le schéma et les noms d'événement existants, le niveau `error`, une date UTC valide et éventuellement un compteur entier sûr. URL, body, exception, stack, tokens et champs arbitraires sont retirés. Destination sans identifiants dans l'URL, HTTPS obligatoire ; HTTP de boucle locale seulement avec opt-in TEST explicite. Authentification Bearer, délai de 5 secondes, redirections refusées, échec avec sortie non nulle et message générique sans secret.

Preuve : un appel du vrai `reportOperationalEvent('server_unhandled_error')` a généré un événement **fictif**. Le relais l'a transmis à un récepteur HTTP local authentifié, qui l'a reçu et acquitté en **204**. Les champs additionnels synthétiques ont été retirés ; un mauvais jeton a été refusé et le relais a échoué sans masquer l'erreur. Aucun e-mail ni message à un destinataire réel.

**Cela ne valide ni ingestion des logs hébergés, ni alerte reçue par un humain, ni surveillance continue.** Aucun canal externe n'est choisi ou connecté sans autorisation. Aucun nouvel endpoint public, stockage de télémétrie ou service payant ajouté.

### Vérification ciblée

**5/5 tests nouveaux passent** (`python3 scripts/ops/test-ops.py`) : bundle vérifiable et clé incorrecte/corruption refusées ; source et secrets de configuration refusés ; modification pendant capture et limite de taille refusées sans fichier incomplet ; archive avec entrée imprévue refusée ; minimisation de l'alerte et refus d'événement/destination non autorisés. Dépendance utilisée et figée : `cryptography==50.0.1`.

Preuves d'intégration supplémentaires : capture Storage réelle réussie ; vérification séparée du bundle écrit ; événement applicatif synthétique réellement reçu en local et refus d'un jeton erroné. Les anciens tests Billing/Connect, de restauration et de permissions ne sont pas relancés.

## Planification préparée, pas activée

`docs/ops/nona-isolated-ops.workflow.yml` est un **modèle inerte**, hors `.github/workflows`. Il prévoit un dépôt d'exploitation **privé** distinct, avec branche par défaut `ops`, un environnement `nona-isolated-test`, secrets TEST protégés et permissions GitHub `contents: read`. Garde explicite dépôt privé + variable d'activation ; lecture de cette cible seule ; aucune connexion à la source.

Proposition : capture quotidienne à 04:23 UTC, conservation de 7 jours, maximum de 64 Mio d'objets par capture, runner Ubuntu standard, timeout 20 minutes. Seul le bundle chiffré est archivé ; clés et configuration en clair ne sont jamais des artifacts. Le compte doit disposer de quota gratuit et d'un **budget Actions avec arrêt des dépenses à 0** avant activation. Les quotas sont partagés avec les autres usages du compte : aucune gratuité illimitée n'est revendiquée. Aucun dépôt, secret Actions, tâche ou abonnement créé/activé par cette passe.

Raisons : le dépôt applicatif actuel est public et ne doit pas contenir de bundle de récupération, même chiffré. Les artifacts d'un dépôt public sont accessibles aux lecteurs du dépôt. GitHub ne déclenche les workflows planifiés que sur la branche par défaut ; ajouter un cron sur la branche de travail ne le rendrait pas actif. Pas de changement de branche par défaut de Nona, ni de merge main pour contourner cette règle.

Une exécution quotidienne future devra être attestée par deux runs distants et la disponibilité du bundle privé après fermeture de cette session. Un heartbeat externe devra ensuite détecter les runs absents : GitHub documente que des exécutions planifiées peuvent être retardées ou abandonnées. Une seule réussite manuelle n'est pas une preuve de récurrence fiable.

La notification d'un workflow échoué peut servir aux sauvegardes/sondes, mais **ne couvre pas automatiquement les erreurs serveur/Auth/Storage de Nona**. Celles-ci nécessitent un accès aux logs du runtime ou une ingestion configurée, un canal validé et une preuve de réception inoffensive. Les secrets de production ne sont pas nécessaires à la recette TEST.

## Activation restante et décision indispensable

Les outils et preuves TEST sont prêts ; **la sauvegarde quotidienne durable et la réception humaine restent NON VALIDÉES**. Aucun lancement commercial GO déclaré.

Option proposée pour avancer sans modifier Nona/main : dépôt GitHub privé dédié **`tpenalba06/NONA-OPS`**, branche par défaut `ops`, strictement pour la cible TEST, clés TEST dans les secrets protégés, budget de dépenses nul et alertes GitHub sur le compte du propriétaire sans e-mail réel. Aucun partage à des tiers. L'autorisation doit couvrir explicitement ce nouvel accès du job au projet TEST et la conservation privée du bundle/clé ; aucune nouvelle saisie de mot de passe Stripe/Supabase demandée.

Après autorisation : vérifier plan/quota/budget et identité du compte, provisionner les entrées privées, exécuter le job isolé, vérifier réception de la notification autorisée et capture privée, puis attester le cycle planifié. Les informations d'exploitation provenant uniquement du tableau de bord doivent rester marquées comme telles tant qu'un export exhaustif de configuration n'est pas disponible.

La recette mobile authentifiée reste le travail indépendant suivant. Les brouillons légaux, configurations de production et blocage externe Connect conservent leurs états antérieurs ; aucune boucle d'onboarding. Le lancement global reste NO-GO.

## Références officielles

- [Supabase : contenu transféré et configuration séparée](https://supabase.com/docs/guides/platform/clone-project).
- [Supabase : backups DB et octets Storage séparés](https://supabase.com/docs/guides/database/overview).
- [GitHub : événements schedule/workflow_dispatch et branche par défaut](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).
- [GitHub : gratuité, quotas partagés et frais Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
- [GitHub : arrêt des dépenses au budget](https://docs.github.com/en/billing/reference/product-usage-included).
- [GitHub : accès aux artifacts](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts).
