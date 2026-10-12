# Alertes serveur — préparation sans activation

Le serveur SSR attend désormais un accusé de réception borné lorsqu’il renvoie un 5xx ou intercepte une exception. `NONA_OPS_ALERT_URL` et `NONA_OPS_ALERT_TOKEN` sont des secrets exclusivement serveur, jamais `VITE_*`. Sans ces deux réglages : aucun envoi, coût ni destination. Aucun secret ou récepteur n’a été créé ou configuré pendant cette préparation.

Le transport POST HTTPS transmet seulement `hostbuddy.operations.v1`, `server_request_failed`, `error` et la date UTC. Il ne reçoit jamais la requête du client, l’exception, l’identité du voyageur ou la commande. URL sans identifiant, query string ou fragment ; aucun suivi de redirection, lecture de réponse, journal de secret ou nouvelle tentative. Accusés acceptés : 200, 201, 202, 204. Un échec produit seulement l’événement fixe `operational_alert_failed` dans les logs existants, sans provoquer un nouvel envoi récursif.

Plafonds : un essai par minute par worker, y compris lors d’un refus du récepteur ; attente maximale de trois secondes sur la réponse 5xx seulement. Les réponses réussies ne sont pas ralenties. Ce plafond local n’est pas un quota global : le récepteur doit appliquer son propre plafond gratuit et dédupliquer par application/événement. Le transport est attendu avant de rendre la réponse : il ne dépend pas d’un traitement lancé en arrière-plan après la fermeture du worker.

## Raccordement restant

Réutiliser une destination privée déjà autorisée, capable d’authentifier ce jeton et de notifier effectivement le propriétaire. Si aucune destination appropriée n’existe, faire approuver le récepteur concret et ses éventuels accès avant de renseigner les secrets. Ne pas transformer la page publique en endpoint de débogage, ni ajouter un accès GitHub aux incidents sans autorisation appropriée. La notification GitHub des sondes HTTP est acquise ; elle ne reçoit pas automatiquement ces événements serveur.

Après approbation, brancher le récepteur sur l’environnement autorisé, constater un seul événement synthétique **en TEST** et son accusé puis sa notification réelle. Vérifier le plafond du récepteur avant cet essai. Ne pas provoquer une panne de production. Ne pas rejouer les validations cœur/Billing/Connect/mobile/restauration/performance.

Limite explicite : ce raccordement couvre les 5xx du serveur web SSR. Les fonctions Stripe/Billing Supabase et les exceptions hors requête gardent leurs journaux sécurisés existants ; leur drainage hébergé reste à raccorder. Cette préparation ne prouve pas une alerte reçue, un déploiement commercial ou une couverture complète.

## Passage à la finition

Référence fonctionnelle inchangée : offre complète, abonnements et services Connect avec 2 %. Une fois les décisions humaines indispensables réglées, finition UX/DA sur la branche existante, puis publication de la version précisément autorisée. La validation de lancement porte uniquement sur les bindings commerciaux, le premier email Auth légitime, le paiement initial et les preuves d’exploitation de cette cible.
