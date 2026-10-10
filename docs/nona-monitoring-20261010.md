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
