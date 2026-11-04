# NONA — raccordement du chat hébergé TEST, 20 octobre 2026

## État vérifié

Le chat HTTP existant sait maintenant sélectionner l'adaptateur direct Ollama Free côté serveur. Le raccordement est compilé et testé hors réseau. **Il n'est pas déployé et aucun guide TEST avec IA active ne peut encore être ouvert.** Aucune nouvelle génération ni capture navigateur avec IA réelle n'a été produite pendant cette reprise. Les 49 appels antérieurs restent les seules générations réelles.

Le point de départ est `7dc4e32`. Les travaux UX non publiés de `nona-lovable-sync` sont préservés sans modification : instantané du diff binaire et des sept fichiers non suivis dans `.output/ux-*`. Ils n'ont pas été fusionnés à l'aveugle dans l'ancienne branche cloud. Logos, DA, composants visuels, Stripe, moteurs de réservation et imports n'ont pas changé.

## Changement concret

`concierge.server.ts` sélectionne `createHostedOllamaTestDependencies` si le drapeau TEST dédié est présent. Le nouveau module réutilise l'adaptateur Gemma 4 31B, les mêmes règles de confidentialité, les réservations atomiques TEST et la comptabilisation existante. La validation métier et le calcul serveur des prix restent inchangés.

Conditions obligatoires, exclusivement côté serveur :

- `NONA_OLLAMA_TEST_ENABLE=hosted-free-test-v1`, `NONA_CLOUD_SCOPE=test` et projet Supabase TEST exact ; refus de `VERCEL_ENV=production`.
- Un seul slug et UUID de logement autorisés, vérifiés contre le guide obtenu par le RPC public existant. Aucun logement ou contexte apporté directement par le navigateur n'est accepté comme source.
- Identité voyageur signée par le serveur. Le quota réseau emploie le HMAC serveur, avec le proxy de confiance explicitement configuré ; sinon réseau partagé restrictif. Le hash de conversation comprend le logement.
- Clé Ollama, clé serveur Supabase et revue Free authentifiée côté serveur. La revue existante reste limitée à quinze minutes. Aucun renouvellement automatique, aucune fabrication d'attestation de crédit gratuit.
- Autorisation TEST activée, non expirée, plafond cumulatif au plus 4 EUR et réserve restante suffisante. Le RPC atomique reste l'arbitre final des quotas et de la concurrence.

Configuration TEST invalide : dépendances fermées, repli guidé, aucun basculement automatique vers un fournisseur payant. Aucun nouvel endpoint de commande/paiement. Aucune clé ni revue privée dans les sources publiques, les captures ou GitHub Actions.

Les quotas TEST historiques sont conservés : organisation 100/jour, logement 30/jour, conversation 20/jour, réseau 10/5 minutes. Ce raccordement n'est pas une activation mensuelle ni une promesse de bêta permanente : le plafond de 20 EUR est désactivé et l'expiration actuelle reste respectée.

## Vérifications de cette reprise

- Suite Vitest entière : **609 réussis, 2 ignorés**, 96 fichiers réussis et un ignoré. Inclut 14 nouveaux tests de raccordement TEST. Aucun résultat simulé n'est présenté comme une nouvelle conversation réelle.
- 42 tests ciblés réussis : raccordement, route HTTP et adaptateur Free. Cas production/autre projet/politique mensuelle, revue absente, identité absente, mauvais logement/slug, expiration, désactivation, dépassement du plafond, conservation du hash serveur et refus d'une double réservation.
- TypeScript et lint des trois fichiers modifiés : réussis, par invocation directe des dépendances locales. `npx tsc` avait tenté une résolution réseau indisponible ; il n'a pas été utilisé comme preuve de succès.
- Compilation isolée du backend et du renderer partagé : réussie. Avertissements existants sur les polices servies au runtime et la taille du bundle UI ; aucun plugin de déploiement Lovable chargé.
- Handler compilé, données synthétiques, sans réseau : code d'accès inconnu, allergènes inconnus et vraie urgence correctement distingués ; trois lectures source, zéro appel IA. Ceci n'est pas un parcours navigateur.
- Lecture Supabase TEST : `enabled=false`, expiration `2026-10-20T13:04:25.657676Z` (15 h 04 Paris), réserve inchangée 980 000 micro-EUR sur 4 000 000. Politique mensuelle désactivée. **49 tentatives et 49 observations**. Un appel de réservation après fermeture retourne `false`.
- La suite native Node et Playwright du précédent checkpoint ne sont pas prétendus réexécutés ici. Les preuves précédentes restent distinctes : 614 tests réussis, trois ignorés et captures navigateur en mode guidé sur GitHub Actions.

## Obstacles précis et prochaine exécution

1. **Autorisation TEST fermée et expirée.** L'instruction explicite interdit son renouvellement implicite. La présente mission ne modifie donc pas la ligne SQL ni l'expiration de la revue Free. Une autorisation explicite pour une nouvelle fenêtre bornée est nécessaire avant de nouvelles générations. Proposition : quinze minutes maximum, exclusivement crédits Free revérifiés, zéro nouvelle dépense et au plus vingt nouvelles générations, compteur cumulatif conservé et fermeture finale. Les quotas existants peuvent réduire ce nombre.
2. **Hébergement TEST non accessible par l'accès Vercel actuel.** La liste des projets est accessible, mais la lecture du projet `corsica-concierge` dans son équipe connue retourne HTTP 403 (scope non autorisé). Aucun CLI Vercel installé n'est disponible comme secours ; aucune installation, recharge ou souscription lancée. Le projet Supabase TEST ne possède aucune Edge Function déployée. Déployer un frontend seul sur un autre hébergeur ne créerait pas le serveur privé manquant et ne constituerait pas le guide cloud demandé.

Une nouvelle fenêtre d'inférence seule ne résout pas l'hébergement. Il faudra une voie de déploiement TEST autorisée et accessible, puis seulement exécuter Playwright contre cette URL. Le runner ne devra recevoir que l'URL et un éventuel accès de recette limité, jamais la clé Ollama ni la clé serveur Supabase. Les captures, réponses `mode=ai`, `usage.modelCalls`, mesures et journaux serveur devront être corrélés. Aucun replay ou mock ne sera présenté comme une preuve cloud navigateur.

La longue conversation, le parcours six langues depuis le vrai navigateur, le récapitulatif 75 EUR sans soumission et la démonstration ouvrable restent **non validés dans une interface hébergée avec IA réelle**. Le contexte reste borné aux dix derniers messages structurés et six messages historiques ; une conversation longue ne signifie pas une mémoire illimitée. La comparaison Haiku 5.5 n'a pas de nouvelle donnée réelle : candidat conservé, aucun classement inventé ni crédit acheté.

Coût de cette reprise : **0 nouvelle génération, 0 nouvelle dépense**. Historique réel inchangé : 49 appels, 0,01021 USD de consommation affichée couverte par Free, zéro dollar payé. Latence médiane historique de la dernière série : 843 ms ; ce n'est pas une latence navigateur mesurée aujourd'hui.

**Conclusion opérationnelle : raccordement serveur prêt à essayer ; bêta privée hébergée encore bloquée. Aucune production modifiée.**
