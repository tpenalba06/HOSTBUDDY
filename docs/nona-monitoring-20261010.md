# Nona — surveillance isolée, 10 octobre 2026

Checkpoint pour la reprise à 8 h. Base applicative : `e9d12a589ccd02554a5ecea84ecb3f5bba4c2fa0`, branche `feat/guest-guide-v2-lot1`. Ne pas refaire restauration, 147 contrôles, Billing, Stripe ou l'installation des jobs ci-dessous. Aucun accès Vercel, crédit Lovable, déploiement production, merge main ou suppression source.

## Résultats nouveaux

- Correction démontrée du reporter navigateur : il transmettait exception originale, message, stack, route et contexte libre. Désormais seuls un message fixe, une classe d'erreur autorisée et un éventuel statut HTTP numérique sont transmis. Aucun objet inconnu n'est converti en chaîne. Les deux providers sont isolés pour qu'une panne de télémétrie ne casse pas la page de secours. L'enrichissement automatique interne du SDK fournisseur n'est pas audité par ce correctif.
- 3 tests ciblés de confidentialité/résilience PASS ; TypeScript et ESLint ciblé PASS. Aucun test financier ou de permissions relancé. Le correctif est sur la branche de travail, pas déclaré déployé ni validé dans une preview.
- `scripts/ops/health-check.py` : quatre lectures uniquement de Supabase TEST `mhhtnqfdkyudwyqlmnce` : santé GoTrue, inscriptions désactivées, bucket guide-media privé, RPC de guide inexistant renvoyant null. Aucun login, e-mail, upload, mutation SQL ou paiement. Clé serveur TEST existante dans un fichier privé ; source/autre référence, redirections et fichiers de clé accessibles au groupe refusés. Sorties fixes sans réponse fournisseur, exception, chemins privés ni secrets.
- 4 nouveaux tests Python PASS : minimisation, erreurs de sonde, garde TEST/fichier de clé/redirections, GET bornés. Lecture réelle depuis Work PASS à 00:29 UTC ; aucune restauration ni recette de permissions répétée.
- Job horaire actif dans le dépôt privé NONA-OPS, branche `ops`, à la minute 47 UTC. Copie inerte dans `docs/ops/nona-isolated-health.workflow.yml`, hors `.github`. Secrets existants réutilisés ; aucun nouveau secret ou permission, abonnement ou ressource payante. Quota Actions inclus partagé ; dépassements bloqués dans la configuration observée sans moyen de paiement valide.
- Run final **38009854953**, HEAD OPS **5e4ab265f649e6b3e83ccb40e9b1140e249a50e3**, succès 12 s. À **00:37:44 UTC** : auth_health PASS 342 ms ; auth_safety PASS 222 ms ; private_storage PASS 951 ms ; database_read PASS 619 ms. HTTP preview ignoré par défaut. Le warning checkout Node 20 forcé vers Node 24 est non bloquant ; ce run prouve l'exécution réelle.
- Run précédent **38009592762** : quatre sondes Supabase PASS, sonde HTTP preview FAIL, notification effectivement reçue dans la boîte GitHub du propriétaire. Une lecture HTTP distincte depuis Work retourne 403 : cela ne prouve pas une panne Nona ni la cause exacte du premier échec GitHub. Le contrôle preview est maintenant un diagnostic manuel opt-in (`check_public_demo=false` par défaut), absent du cycle horaire, pour éviter les faux positifs. Ne pas répéter des tentatives d'accès.

## Ce qui n'est pas validé

- Réception e-mail/push : non validée ; e-mail Actions désactivé. Aucune intervention externe nécessaire pour le canal GitHub déjà reçu.
- Premier déclenchement horaire planifié et première sauvegarde quotidienne planifiée : non attestés lors de ce checkpoint ; les runs manuels ne prouvent pas la récurrence. Sauvegarde quotidienne antérieure inchangée, 04:23 UTC, médias/buckets/réglages Auth publics/configuration observée, pas snapshot DB/identités Auth quotidien.
- Les sondes détectent une indisponibilité des services TEST et une dérive de deux garde-fous ; elles ne collectent pas les exceptions de l'application hébergée et ne prouvent pas la disponibilité HTTP du site. Le relais d'événements serveur antérieur reste seulement reçu en local. L'ingestion nécessite un export/accès exploitable aux logs de l'hébergement actuel ; aucun endpoint public improvisé.
- Pas de surveillance indépendante des crons absents. GitHub peut retarder/omettre un cycle ; pas de garantie de surveillance continue. Pas de couverture production dans ce travail autorisé exclusivement TEST.

## Reprise sans doublons

Relire ce checkpoint et le rapport d'exploitation avant toute mutation. Si accessible, constater les cycles planifiés en lecture seule ; ne pas relancer les trois anciennes recettes sauvegarde ou les deux runs santé. Puis avancer sur le prochain travail indépendant : recette mobile authentifiée et performance d'une preview dont le HEAD est confirmé, sans UX/DA. Une mutation distante concurrente exige une vérification du HEAD et un fast-forward avec garde, jamais un force push. Maintenir le NO-GO commercial jusqu'à couverture des blocages déjà identifiés : logs hébergés/indisponibilité HTTP, sauvegarde récurrente DB/Auth, recette mobile, documents légaux et configuration de lancement.

Preuves : https://github.com/tpenalba06/NONA-OPS/actions/runs/38009854953/job/114087091907 ; https://github.com/tpenalba06/NONA-OPS/actions/runs/38009592762.


## Reprise active — 10 octobre 2026, 19:17 Paris

L'historique GitHub privé est accessible en lecture seule et affiche huit runs : deux contrôles santé planifiés réussis et une sauvegarde planifiée réussie. Dernier contrôle santé : 38054244084, schedule, succès, 15:03 Paris ; sauvegarde : 38045846944, schedule, succès, 12:42 Paris. Aucun nouveau passage n'est visible à 19:17. Le contrôle santé a donc plus de quatre heures : absence de surveillance récente, sans preuve d'une panne Supabase. Aucun run relancé et aucun artifact/secret consulté.

La tâche Work existante `Reprendre Nona TEST` a été mise à jour avec un contrôle indépendant du planificateur GitHub, sans ajouter de service ni de credential : signaler un nouveau run échoué, plus de trois heures sans contrôle santé automatique terminé, ou plus de 36 heures sans sauvegarde automatique réussie. Les runs manuels n'effacent pas ce retard. Session inaccessible : état non vérifiable, jamais un PASS. Les alertes sont limitées aux changements d'état ; retour à la normale signalé après un nouveau succès récent. La tâche conserve la poursuite du chantier et les gardes contre les modifications concurrentes.

**Prouvé maintenant :** lecture réelle et détection du retard santé ; enregistrement confirmé de la consigne de surveillance Work. **Non prouvé :** exécution future et réception automatique de cette nouvelle alerte. Work dépend de sa propre planification et d'une session GitHub disponible ; ce filet ne constitue pas une surveillance garantie ni un service de production.

Les acquis restauration/147 permissions/Stripe TEST ne sont pas répétés. Aucun nouveau bug applicatif démontré. Restent ouverts : accès aux logs hébergés, disponibilité HTTP du site, preview TEST accessible pour la recette mobile authentifiée, sauvegarde récurrente DB/identités Auth, validation juridique et configuration de lancement. Aucun accès Vercel ni dépense. NONA-OPS inchangé à `5e4ab265f649e6b3e83ccb40e9b1140e249a50e3`.


## Suite autonome — 10 octobre 2026, soirée

- Détection déterministe des cycles manquants : `scripts/ops/cycle-freshness.py` lit uniquement un relevé JSON minimisé fourni par le collecteur indépendant Work. Aucun accès réseau, credential ou écriture. Il distingue succès récent, retard, nouvel échec et état non vérifiable. L'historique inaccessible, incomplet, trop ancien, les timestamps invalides et les dépôts non autorisés ne produisent jamais de PASS. Runs manuels ignorés ; skipped/cancelled ne valent pas succès. Seuils : santé 3 heures, sauvegarde 36 heures.
- Sept tests ciblés réussissent, incluant un champ secret canari absent des sorties. Le relevé GitHub réel de cette passe signale `health_stale` et `backup_recent_success` ; preuves minimisées dans `docs/evidence/nona-cycle-freshness-20261010.json`. Il s'agit d'un relevé ponctuel, pas d'un nouveau collecteur live installé dans GitHub. La réception automatique Work reste à constater.
- Bug réellement reproduit dans l'outil de sauvegarde : une clé accessible via un lien symbolique était acceptée. Le test échouait avant correction. Lecture désormais par `O_NOFOLLOW`, vérification `fstat` du fichier ouvert et de ses permissions, refus des fichiers non réguliers. Deux nouveaux tests PASS, cinq tests existants de sauvegarde PASS après cette modification. Aucun accès aux clés réelles dans ces tests.
- Même correctif appliqué au dépôt privé NONA-OPS, branche `ops`, commit `cc321065e2eb6e061b6ac5037f386a0b1772fd00`. Contenu GitHub relu et identique au correctif attendu hors newline finale ; racine spécifique OPS préservée. Aucun changement de workflow, secret, accès ou budget. Une seule sauvegarde manuelle de validation du nouveau correctif a réussi, run `38071838502`, en 45 secondes, artifact privé présent. Elle ne remet pas à zéro le compteur des sauvegardes automatiques.
- Voie Sites examinée sans création ni publication : les outils de publication sont explicitement des déploiements de production ; la preview locale gérée exige `$control-browser`, absent des capacités disponibles. Aucune publication Sites ni nouvelle ressource effectuée. Le build Cloudflare existant n'est pas à lui seul une preuve de preview accessible. Aucune nouvelle tentative Vercel.

Limites inchangées : preview TEST privée accessible et recette mobile réelle, logs hébergés/disponibilité HTTP, sauvegarde récurrente DB/identités Auth, juridique/configuration de lancement. Aucun Stripe/Billing, production, suppression source, crédit Lovable ou dépense. Aucun service de surveillance garanti. Lancement NO-GO.
