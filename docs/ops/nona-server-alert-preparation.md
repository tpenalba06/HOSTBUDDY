# Alertes serveur — préparation sans activation

Le serveur SSR attend désormais un accusé de réception borné lorsqu’il renvoie un 5xx ou intercepte une exception. `NONA_OPS_ALERT_URL` et `NONA_OPS_ALERT_TOKEN` sont des secrets exclusivement serveur, jamais `VITE_*`. Sans ces deux réglages : aucun envoi, coût ni destination. Aucun secret ou récepteur n’a été créé ou configuré pendant cette préparation.

Le transport POST HTTPS transmet seulement `hostbuddy.operations.v1`, `server_request_failed`, `error` et la date UTC. Il ne reçoit jamais la requête du client, l’exception, l’identité du voyageur ou la commande. URL sans identifiant, query string ou fragment ; aucun suivi de redirection, lecture de réponse, journal de secret ou nouvelle tentative. Accusés acceptés : 200, 201, 202, 204. Un échec produit seulement l’événement fixe `operational_alert_failed` dans les logs existants, sans provoquer un nouvel envoi récursif.

Plafonds : un essai par minute par worker, y compris lors d’un refus du récepteur ; attente maximale de trois secondes sur la réponse 5xx seulement. Les réponses réussies ne sont pas ralenties. Ce plafond local n’est pas un quota global : le récepteur doit appliquer son propre plafond gratuit et dédupliquer par application/événement. Le transport est attendu avant de rendre la réponse : il ne dépend pas d’un traitement lancé en arrière-plan après la fermeture du worker.

## Raccordement restant

Réutiliser une destination privée déjà autorisée, capable d’authentifier ce jeton et de notifier effectivement le propriétaire. Si aucune destination appropriée n’existe, faire approuver le récepteur concret et ses éventuels accès avant de renseigner les secrets. Ne pas transformer la page publique en endpoint de débogage, ni ajouter un accès GitHub aux incidents sans autorisation appropriée. La notification GitHub des sondes HTTP est acquise ; elle ne reçoit pas automatiquement ces événements serveur.

Après approbation, brancher le récepteur sur l’environnement autorisé, constater un seul événement synthétique **en TEST** et son accusé puis sa notification réelle. Vérifier le plafond du récepteur avant cet essai. Ne pas provoquer une panne de production. Ne pas rejouer les validations cœur/Billing/Connect/mobile/restauration/performance.

Limite explicite : ce raccordement couvre les 5xx du serveur web SSR, y compris les réponses 503 des handlers Stripe/Billing TanStack examinés. Ces handlers sont dans le serveur applicatif, pas dans des fonctions Supabase distinctes. Les événements traités avec une réponse 2xx/4xx et les exceptions hors requête conservent leurs logs sécurisés et ne sont pas drainés automatiquement par ce seul transport. Cette préparation ne prouve pas un déploiement commercial ou une couverture complète.

## Passage à la finition

Raccordement TEST effectué le 13 octobre : RPC à accès service-only dans `mhhtnqfdkyudwyqlmnce`, type d’erreur et horodatages seuls, plafond global un enregistrement par minute. Un seul événement synthétique via le transport serveur réel : run NONA-OPS **38326178218**, transport **ACKNOWLEDGED**, inbox **ALERT/count=1**, notification du même run constatée dans la boîte GitHub du propriétaire à **02:14 Paris**. Le statut Failure est intentionnel pour la notification, pas une panne de l’application. Aucun email/SMS affirmé reçu. Le drainage est enregistré dans le job santé existant, commit OPS **e0d9560e5a3ad69f86afa809b36d4fdaf57963db** ; pas de nouveau job horaire ni nouveau secret.

La preuve exécute le transport serveur en CI vers le récepteur TEST hébergé. Elle ne prouve pas un 5xx dans le worker publié, qui n’a été ni reconfiguré ni publié. Le serveur futur peut utiliser ses bindings protégés après autorisation. Le récepteur commercial est préparé par `scripts/ops/commercial-alerts.py`, avec fichier privé distinct `nona-commercial-alert-approval.json` resté false ; aucune RPC commerciale créée. Le lecteur commercial utilise le workflow commercial distinct pour son watermark, sans mélanger les notifications TEST. Les anciennes alertes restent conservées ; pas de suppression automatique.

Référence fonctionnelle inchangée : offre complète, abonnements et services Connect avec 2 %. Une fois les décisions humaines indispensables réglées, finition UX/DA sur la branche existante, puis publication de la version précisément autorisée. La validation de lancement porte uniquement sur les bindings commerciaux, le premier email Auth légitime, le paiement initial et les preuves d’exploitation de cette cible.
