# Alertes serveur — préparation sans activation

Le serveur SSR attend désormais un accusé de réception borné lorsqu’il renvoie un 5xx ou intercepte une exception. `NONA_OPS_ALERT_URL` et `NONA_OPS_ALERT_TOKEN` sont des secrets exclusivement serveur, jamais `VITE_*`. Sans ces deux réglages : aucun envoi ni destination. Le récepteur TEST est installé et sa réception prouvée ci-dessous, avec la clé TEST existante. Mise à jour du 13 octobre : le récepteur commercial est maintenant installé, avec preuve SQL ci-dessous. Aucun secret nouveau ni binding du worker publié n’a été configuré.

Le transport POST HTTPS transmet seulement `hostbuddy.operations.v1`, `server_request_failed`, `error` et la date UTC. Il ne reçoit jamais la requête du client, l’exception, l’identité du voyageur ou la commande. URL sans identifiant, query string ou fragment ; aucun suivi de redirection, lecture de réponse, journal de secret ou nouvelle tentative. Accusés acceptés : 200, 201, 202, 204. Un échec produit seulement l’événement fixe `operational_alert_failed` dans les logs existants, sans provoquer un nouvel envoi récursif.

Plafonds : un essai par minute par worker, y compris lors d’un refus du récepteur ; attente maximale de trois secondes sur la réponse 5xx seulement. Les réponses réussies ne sont pas ralenties. Ce plafond local n’est pas un quota global : le récepteur doit appliquer son propre plafond gratuit et dédupliquer par application/événement. Le transport est attendu avant de rendre la réponse : il ne dépend pas d’un traitement lancé en arrière-plan après la fermeture du worker.

## Passage commercial après accord

La solution choisie réutilise le backend Supabase de la cible et la boîte GitHub du propriétaire, sans nouveau fournisseur. La destination commerciale proposée est le même récepteur service-only sur `jzbjpaucgckggumhowns`, avec lecture par NONA-OPS privé. Elle exige l’autorisation et les entrées commerciales propres. Ne pas transformer la page publique en endpoint de débogage, ni ajouter un accès GitHub aux incidents sans autorisation appropriée.

La preuve synthétique TEST est close : ne pas la rejouer. Après approbation commerciale, appliquer le récepteur et les bindings de cette seule cible, vérifier la réception de sa notification autorisée et préserver les plafonds. Ne pas provoquer une panne de production. Ne pas rejouer les validations cœur/Billing/Connect/mobile/restauration/performance.

Limite explicite : ce raccordement couvre les 5xx du serveur web SSR, y compris les réponses 503 des handlers Stripe/Billing TanStack examinés. Ces handlers sont dans le serveur applicatif, pas dans des fonctions Supabase distinctes. Les événements traités avec une réponse 2xx/4xx et les exceptions hors requête conservent leurs logs sécurisés et ne sont pas drainés automatiquement par ce seul transport. Cette préparation ne prouve pas un déploiement commercial ou une couverture complète.

## Passage à la finition

Raccordement TEST effectué le 13 octobre : RPC à accès service-only dans `mhhtnqfdkyudwyqlmnce`, type d’erreur et horodatages seuls, plafond global un enregistrement par minute. Un seul événement synthétique via le transport serveur réel : run NONA-OPS **38326178218**, transport **ACKNOWLEDGED**, inbox **ALERT/count=1**, notification du même run constatée dans la boîte GitHub du propriétaire à **02:14 Paris**. Le statut Failure est intentionnel pour la notification, pas une panne de l’application. Aucun email/SMS affirmé reçu. Le drainage est enregistré dans le job santé existant, commit OPS **e0d9560e5a3ad69f86afa809b36d4fdaf57963db** ; pas de nouveau job horaire ni nouveau secret.

La preuve exécute le transport serveur en CI vers le récepteur TEST hébergé. Elle ne prouve pas un 5xx dans le worker publié, qui n’a été ni reconfiguré ni publié. Le serveur futur peut utiliser ses bindings protégés après autorisation. Le récepteur commercial est préparé par `scripts/ops/commercial-alerts.py`, avec fichier privé distinct `nona-commercial-alert-approval.json` resté false ; Les deux RPC commerciales ont été créées après confirmation ciblée du 13 octobre ; la preuve est conservée dans `nona-commercial-receiver-receipt-20261013.md`. Le lecteur commercial utilise le workflow commercial distinct pour son watermark, sans mélanger les notifications TEST. Les anciennes alertes restent conservées ; pas de suppression automatique.

Référence fonctionnelle inchangée : offre complète, abonnements et services Connect avec 2 %. Une fois les décisions humaines indispensables réglées, finition UX/DA sur la branche existante, puis publication de la version précisément autorisée. La validation de lancement porte uniquement sur les bindings commerciaux, le premier email Auth légitime, le paiement initial et les preuves d’exploitation de cette cible.

Le lecteur périodique final est épinglé sur **afca9eec04fc5081776b02331cf807a06f9d56e4**, enregistré par le commit privé **0359bd787bfb63bcb9e268d5e17031184ff3d6ed**. Il utilise la fin du run déjà notifié, pour éviter de réémettre au cycle suivant un événement survenu pendant la preuve. Cette correction a sa régression locale nouvelle ; aucune nouvelle alerte synthétique ni ancienne recette n’a été relancée.

## Installation commerciale confirmée — 13 octobre 2026

Récepteur installé via l’éditeur SQL Lovable du projet HOSTBUDDY lié à `jzbjpaucgckggumhowns`. Précontrôle : schéma et deux fonctions absents, rôle service existant. SQL exact relu et comparé avant exécution. Un événement synthétique sous `SET LOCAL ROLE service_role` a été reçu à **11:01:52 UTC / 13:01:52 Paris**. RLS active ; droits explicites EXECUTE : `postgres`, `service_role` exclusivement ; aucun accès schéma/table/fonctions pour `anon` ou `authenticated`, aucun grant PUBLIC. Aucun objet métier modifié. Ne pas rejouer cette injection.

La réception SQL est prouvée ; le transport HTTP commercial et la notification ne le sont pas. Les accès source externes ne sont pas exposés par l’interface Lovable Cloud standard ; aucun secret extrait, aucune méthode cachée utilisée. Le worker applicatif n’a pas été publié. Le workflow privé commercial est installé au commit OPS `ca24c9991da23e893f19ec6b5e14997330ca5c2d`, sans étape Billing ni cron actif, tant que ces raccordements restent indisponibles.

## Canal propriétaire — 13 octobre, 14:13 Paris

Le réglage Actions du compte GitHub était « on GitHub, failed workflows only », sans e-mail. Le canal e-mail a été activé vers l’adresse de notification préexistante, en conservant les échecs seuls. Ce réglage est global au compte GitHub, pas réservé à NONA-OPS. Aucune nouvelle adresse, clé, fournisseur ou dépense.

Une seule preuve du nouveau canal a été lancée via une option dédiée de alerts.yml : `check_notification_channel=true`, setup_receiver=false, prove_delivery=false. Run **38395628783**, commit privé **9c226baa32715799149b7a468aa85f96adc86798**, durée totale 8 secondes ; job de backend `alerts` **Skipped**, job `notification_channel` 3 secondes **Failure intentionnelle** avec annotation fixe « No incident ». Aucun checkout, secret, appel DB/Auth/Storage/Stripe ni nouvel événement dans les récepteurs. Notification de ce run constatée dans la boîte GitHub du propriétaire à **14:13 Paris**. Réception de l’e-mail non constatée par l’agent : confirmation propriétaire attendue, pas de second essai automatique.

Le monitoring intégré Lovable a été examiné dans sa documentation officielle : https://docs.lovable.dev/features/project-monitoring . Il consomme des crédits à chaque contrôle achevé ; il n’a pas été activé. Le transport/lecteur commercial reste non raccordé ; cette preuve du canal ne démontre pas une notification d’erreur du worker commercial.

Décision utilisateur actualisée : notifications et exploitation avant UX/DA ; UX/DA dernière étape avant lancement. Sauvegardes commerciales automatiques et activation Stripe Live reportées après mise en ligne ; exports téléchargés sur son PC déclarés disponibles, contenu non inspecté par l’agent. Aucun GO d’exploitation complet déduit de ces exports. L’interdiction de publier ou d’engager une dépense reste en vigueur.

## Monitoring natif activé — 13 octobre 2026

Après autorisation explicite ciblée des crédits inclus, le monitoring du projet Lovable `ad0b09fe-b134-491b-8601-9d64d6d27b86` a été activé. Configuration enregistrée puis rouverte : **Daily at 6:00**, **Every time**, fuseau **Europe/Paris**. Il contrôle aussi les jours sans changement de code. L’interface indique **No checks run yet** ; première exécution attendue autour du 14 octobre à 6 h Paris, sans garantie d’heure exacte. Aucune exécution manuelle ni panne synthétique supplémentaire.

Solde observé avant activation : 66,9 crédits de workspace et 5 crédits quotidiens disponibles. Usage limité à ce monitoring avec les crédits inclus ; aucun achat, recharge ou changement de plan. La recharge automatique n’était pas activée (interface proposant son activation) ; ce parcours a été fermé sans validation. Auto-fix security issues reste désactivé. Aucun message à l’agent Lovable, déploiement, publication, modification UX/DA ou Stripe.

Cette activation remplace l’état historique « monitoring non activé » ci-dessus. Elle ne prouve encore ni le premier contrôle ni la réception d’une alerte Lovable. Elle ne raccorde pas le transport HTTP/lecteur du récepteur commercial privé. La notification GitHub déjà reçue reste une preuve distincte. Ne pas rejouer les tests acquis : constater le premier cycle planifié et ses résultats lorsque disponibles.
