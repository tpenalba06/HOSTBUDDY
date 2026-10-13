# Sauvegarde commerciale — autorisée, job installé, accès source bloquant

Réutiliser le dépôt privé NONA-OPS et le mécanisme acquis : export PostgreSQL public/Auth/Storage, chiffrement AES-GCM, contrôle indépendant après récupération de l’artifact. Le nouveau lanceur `scripts/ops/commercial-database-backup.py` charge une instance distincte du moteur existant après validation stricte du fichier privé d’autorisation. Le lanceur TEST et ses protections restent inchangés. La seule cible commerciale préparée est `jzbjpaucgckggumhowns`, jamais le clone TEST.

Le fichier modèle `nona-commercial-backup-approval.json` est `authorized=false`. Il n’est pas une autorisation humaine et ne doit pas être armé par l’agent avant instruction explicite. La commande exige une copie privée 0600 avec autorisation réelle, connexion SQL de la bonne cible, CA officielle et clé commerciale distincte ; il ne génère aucun secret et ne restaure rien. Sans ces entrées, résultat BLOCKED avant tout accès DB.

Les snapshots récurrents déjà observés dans Lovable Cloud restent le premier étage existant ; aucun abonnement ou déploiement nouveau n’est nécessaire. La copie chiffrée hors hébergeur exige l’autorisation explicite de transmettre les données du backend commercial et Auth vers **tpenalba06/NONA-OPS privé**, après accord contractuel sur cette destination. Ne pas exporter les données commerciales dans la récupération TEST, ni utiliser le mot de passe TEST sur la source.

## Activation par l’agent après accord humain

1. Obtenir par canal sécurisé les accès SQL/CA actuels de la source et la clé de chiffrement distincte conservée hors du dépôt ; ne rien demander dans le chat. Préférer un rôle d’export restreint couvrant Auth ; si le fournisseur n’offre pas cet accès, faire confirmer la méthode officiellement supportée. Aucun changement de mot de passe ou rôle pendant cette préparation.
2. Installer une copie du job DB acquis dans NONA-OPS avec les entrées **NONA_COMMERCIAL_DATABASE_JSON**, **NONA_COMMERCIAL_DATABASE_CA_PEM**, **NONA_COMMERCIAL_BACKUP_KEY_HEX**, **NONA_COMMERCIAL_BACKUP_APPROVAL_JSON**, dans un environnement commercial protégé. Tous les chemins temporaires sont 0700/0600 ; rien dans les logs. La commande utilise `commercial-database-backup.py` plutôt que le lanceur TEST. L’export est read-only et le fichier nouveau n’écrase pas une copie existante.
3. Garder le budget Actions zéro / arrêt des dépenses ; plafond 32 Mio, artifact chiffré seul, compression désactivée, retention 7 jours proposée. Commande `backup` puis `verify`, upload, récupération dans un dossier privé et `verify` de la même capture. Ne pas refaire une restauration complète acquise.
4. Sauvegarder séparément les octets du bucket `guide-media` via `scripts/ops/commercial-media-backup.py` avec la même autorisation privée et les entrées commerciales propres ; la metadata Storage du dump ne contient pas ces octets. Le lanceur reprend les primitives chiffrées acquises, refuse un bucket public, limite les octets à 16 Mio et conserve les vrais paramètres Auth sans changer l’ouverture des inscriptions. Les autres buckets restent hors de ce périmètre préparé.
5. Exporter la configuration non secrète (région, Auth, origines, versions, fournisseurs, paramètres des buckets) et conserver les secrets via leur gestionnaire sécurisé. DB dump ne reconstruit pas SMTP, clés OAuth/Stripe, Vault et configuration du fournisseur.
6. Après première capture/récupération commerciale réussie, activer le quotidien au créneau distinct du TEST et notifier les échecs au propriétaire. Une copie TEST ne clôt pas cette preuve commerciale.

## Budget et exploitation

Lecture au raccordement TEST : 83/2000 minutes incluses, stockage affiché 0/0,5 Go, 0 dollar facturable, budget Actions 0 avec Stop usage Yes. Estimation conservatrice des jobs déjà préparés : HTTP et santé horaires, DB et médias quotidiens environ 1600 minutes/mois si les jobs horaires restent sous une minute ; ajouter des jobs horaires séparés d’alertes/Billing dépasserait rapidement le gratuit. Les alertes partagent donc le job santé. Le temps réel consommé prime sur cette estimation et le blocage zéro dépense reste activé.

Aucun RPO/RTO ou délai d’alerte commercial garanti ici. GitHub peut retarder ou omettre les schedules : contrôle des cycles manquants à réutiliser, sans présenter ce même ordonnanceur comme surveillance indépendante de lui-même. Ne pas augmenter les quotas pour contourner un arrêt de budget.

## État réel au 13 octobre 2026 après confirmation

L’autorisation ciblée DB/Auth/médias chiffrés vers NONA-OPS privé, sept jours, est acquise. Le workflow ops-only est installé dans `.github/workflows/commercial.yml` du dépôt privé au commit `ca24c9991da23e893f19ec6b5e14997330ca5c2d`, checkout immuable `4073664055727460bea5bc65b672398842ac486e`, aucun Billing, aucun déclenchement push ou cron actif. Il reste verrouillé par les variables/entrées privées absentes ; aucun export commercial ni artifact commercial créé.

Blocage réel : l’interface standard Lovable Cloud ne fournit pas la connexion SQL ni la clé service aux outils externes. Référence officielle : https://supabase.com/docs/guides/troubleshooting/identify-lovable-cloud-or-supabase-backend. Faire confirmer une voie supportée par le fournisseur ; ne pas extraire ses secrets internes, créer une passerelle publique, consommer de crédits agent ou migrer l’hébergement sans accord distinct.

Quota relu : 87/2000 minutes Actions, stockage affiché 0/0,5 Go, zéro dollar facturable, budget Actions zéro / Stop usage Yes. Le journal DB TEST affiche encore seulement les deux runs manuels acquis : premier cycle DB planifié non confirmé, aucun retest déclenché. Santé TEST planifiée : run `38369249144`, succès, lecture inbox PASS/count=0.
