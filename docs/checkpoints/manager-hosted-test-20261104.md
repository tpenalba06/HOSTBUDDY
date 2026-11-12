# NONA — gestionnaire complet hébergé sur TEST, 4 novembre 2026

## Verdict et URL

Gestionnaire TEST hébergé : **VALIDÉ dans le périmètre décrit ci-dessous**. Bêta externe : **NON OUVERTE**, aucun destinataire autorisé fourni et aucune invitation envoyée. IA et paiement continu : désactivés.

- Projet Vercel existant `prj_JNddG5i5NkQyvQI83Blh7X02GVzV`, équipe `team_7ootXJgYQeic3jxHpiRxpXN2`.
- Déploiement final `dpl_DF5Mm6Vna1fEnXiBAQJGYQBDr8AD`, READY, target=staging, source `5a5b58cc8a26d4d9465c7081a93e097156ceb1a8`.
- Connexion : https://nona-concierge-test-20261020-4a1av0oaa.vercel.app/auth?mode=login
- Gestionnaire : https://nona-concierge-test-20261020-4a1av0oaa.vercel.app/app
- Livret TEST : https://nona-concierge-test-20261020-4a1av0oaa.vercel.app/l/nona-navigateur-test-6b4b7cdf-8f0714

Le projet reste live=false et protégé par Vercel Authentication/SSO (`all_except_custom_domains`). Aucun changement de protection, lien de contournement, promotion ou déploiement production. Les anciens déploiements et bundles sont conservés. Aucun nouveau projet ni abonnement créé.

## Déploiement et protections propres à la recette

L’ancien paquet ne contenait que le guide. Le build complet Nitro Vercel contient maintenant le gestionnaire, l’éditeur, les assets et le livret invité. La création passe par le dépôt Git autorisé et son SHA exact ; aucun renvoi aveugle des anciens uploads. Quatre variables publiques de configuration Supabase TEST ont été ajoutées au seul scope Preview, sans modification d’une valeur production.

Le script dédié `scripts/validation/build-nona-manager-test.mjs` refuse un build production ou un backend autre que `mhhtnqfdkyudwyqlmnce`. Le build standard Lovable conserve son comportement. L’enveloppe de validation du serveur refuse un runtime production, un autre projet Vercel ou un autre backend. Elle retire du processus les clés IA, Stripe et l’OIDC Gateway implicite, impose les autorisations IA fermées, et refuse les requêtes de commandes publiques/paiement/webhooks. Aucune clé privée n’est intégrée au paquet frontend.

Le premier déploiement `dpl_DLR4MhqBqRiZfY87cQsAXLZJvxBu` était READY mais produisait une erreur de démarrage : l’enveloppe appelait l’export Nitro comme une fonction Node alors que le preset expose `{ fetch }`. Le tableau de bord authentifié a donné l’erreur précise. Correction conservée dans `5a5b58c`, test réel du paquet compilé `/auth`=200 et commande POST=405, puis nouvelle Preview fonctionnelle. L’ancien déploiement en échec n’est pas annoncé comme validé.

Les API de logs de build/runtime ont répondu403. Le tableau de bord Vercel de la session existante a permis le diagnostic sans désactiver la protection. Les erreurs de l’API ne sont pas assimilées à une absence d’erreurs serveur.

## Parcours gestionnaire réel

Compte synthétique existant `e000c869-38d4-432f-874c-20983a30b6ae`, organisation `c4edc96c-482a-46fb-9efe-ed3c7f9dd8e1`, logement `37ce8e1c-81b4-4b89-bdeb-211c65772c44`. Domaine de compte vérifié `example.invalid` et rôle owner/admin vérifié avant connexion. Une session Supabase légitime a été créée via vérification OTP d’un lien généré pour ce compte, sans envoi d’e-mail ni changement de mot de passe. Transfert chiffré, aucun jeton en clair sur disque ou dans Git.

Le vrai navigateur distant a affiché le tableau de bord, son seul logement, l’éditeur et le catalogue. Un nouveau service entièrement fictif a été enregistré depuis le vrai formulaire : **Validation hébergée — BROUILLON TEST 2026-11-04**, id `d67ce9ae-2ad5-425f-92c8-0911840a0363`, 25 EUR par personne, quantité maximale3, is_active=false confirmé en base. Ses mentions précisent qu’aucune prestation, réservation, condition commerciale ou paiement réel n’existe. L’ancien brouillon est conservé. Zéro commande créée pour ce nouveau service.

Le livret invité publié a été ouvert sur le même déploiement et expose zéro service actif. Aucune publication du service, de modifications du livret ou de service commercial Villa Mare. Aucun appel Stripe, aucun paiement, aucun e-mail ou invitation externe.

Contrôles desktop et mobile réels : l’éditeur et le livret s’affichent. À390px, mesure du gestionnaire innerWidth=390, clientWidth=375, scrollWidth=375 (barre de défilement incluse) ; aucun débordement horizontal. Captures du nouveau brouillon désactivé, titres et actions séparés, DA et mascotte conservées. L’override viewport a été réinitialisé.

Cette validation couvre une session authentifiée réelle, **pas une connexion positive par mot de passe ni Google OAuth**. Ces deux parcours ne sont pas annoncés comme recettés.

## Isolation, sécurité et fermeture

Avec le JWT réel du compte synthétique : son logement est lisible, aucune propriété privée d’une autre organisation n’est visible, les lectures de services et commandes de l’organisation étrangère retournent zéro ligne. Le backend possède bien un logement dans l’autre organisation : le test n’est pas fait sur un tenant inexistant.

Une tentative contrôlée de création de service dans l’autre organisation est refusée par le RPC : P0001, message borné `not allowed`. Zéro ligne de probe créée, confirmé indépendamment. Le premier vérificateur attendait42501 ; la définition distante a été inspectée avant d’adapter l’assertion au code réel P0001. Aucun droit n’a été modifié. Le trigger existant de catalogue vérifie aussi l’appartenance de chaque `property_ids` à l’organisation ; aucune nouvelle migration nécessaire.

Avec la clé publique anonyme : aucune propriété privée lisible ; `get_public_guide` retourne le seul livret publié attendu et zéro service actif. Le service TEST demeure désactivé.

Conseiller sécurité Supabase inspecté : tables serveur sous RLS sans policy (accès fermé), fonctions SECURITY DEFINER signalées. Les helpers de membership/propriété contrôlent `auth.uid()` et `rls_auto_enable` est un event_trigger ; aucune autorisation élargie en réponse aux alertes. La protection contre les mots de passe compromis demeure signalée désactivée ; elle n’a pas été activée ni présentée comme testée. Référence : https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

La session temporaire a été révoquée pour ce seul compte, puis le navigateur déconnecté. Zéro session restante pour le compte synthétique ; ouvrir `/app` retourne au formulaire d’authentification. Les jetons d’accès émis gardent leur durée native de validité JWT : aucune invalidation instantanée universelle n’est revendiquée. Le coffre temporaire ne conserve plus son access token.

IA : zéro nouvel appel, observations TEST cumulatives120, réserve2400000 micro-EUR, cap2520000, enabled=false. Politique mensuelle20 EUR toujours disabled. Aucun usage d’agent ou de crédits Lovable.

## Vérifications et checkpoint

Vitest679 réussis,2 ignorés ; Node22 réussis,1 ignoré (dont trois nouveaux tests d’enveloppe TEST) ; TypeScript et lint des fichiers changés réussis. Build complet local et build Vercel réussis. Audit184 fichiers frontend du paquet Vercel : zéro clé privée du coffre et zéro identifiant Supabase production. Les sources de projet synchronisées sont inchangées.

Preuves locales dans le workspace parent `output/nona-manager-beta-20261104` : captures dashboard/services/guide desktop/mobile, mesure viewport, session-checks, isolation-checks, état après déconnexion, tests/build/lint/audit. Les sessions et clés sont absentes du dépôt et des captures. Un nouveau bundle Git complet et son reçu de restauration identifient le checkpoint final.

## Étape suivante : destinataire nommé

Il faut l’adresse e-mail explicitement autorisée du premier testeur avant toute invitation. L’accès doit rester nominatif et authentifié ; aucun lien de contournement SSO ne sera créé. L’offre Hobby affichée autorise un collaborateur externe à la fois, sous réserve du slot disponible : https://vercel.com/docs/deployments/sharing-deployments et https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication . Aucun passage payant n’est autorisé.

La bêta ne doit pas être annoncée ouverte avant l’accès nominatif réellement testé et la validation des modalités d’inscription du testeur. L’IA continue et le plafond mensuel restent désactivés ; l’accord de recette précédent ne les autorise pas.
