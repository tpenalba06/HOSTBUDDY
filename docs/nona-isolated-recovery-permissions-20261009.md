# Nona — reprise Supabase isolée et permissions réelles

9 octobre 2026 — **PASS pour la reprise DB/Auth/Storage sur Supabase TEST et les permissions réelles.** Ces résultats remplacent l'état « cible inaccessible / matrice non exécutée » du rapport précédent. Aucun besoin d'intervention supplémentaire pour ce périmètre. Ils ne constituent pas une autorisation de lancement commercial.

## Cible et sécurité de la restauration

| Contrôle | Preuve / résultat |
| --- | --- |
| Cible | `nona-recovery-test-20261009`, project ref `mhhtnqfdkyudwyqlmnce` |
| Isolation | Nouveau projet indépendant de la source ; avant import : zéro table publique, zéro utilisateur Auth, zéro objet et bucket Storage |
| Infrastructure | Organisation LOULOU, plan Free, compute Nano, Ireland ; PostgreSQL 17.11 |
| Source | Aucune restauration, suppression, modification de rôle ou écriture sur la base source |
| Émissions avant import | Inscriptions et providers désactivés ; aucun job, Function, webhook applicatif, secret OAuth/Vault ou paiement installé |
| État Auth après recette | Inscription publique et connexion anonyme désactivées, confirmation d'adresse activée ; connexion e-mail/mot de passe des seules fixtures permise ; SMS/SAML/Web3/OAuth désactivés |
| E-mail | Hook Postgres privé `nona_recovery_private.block_email` activé ; appel réel à la récupération de mot de passe d'une fixture : HTTP 403, `External email disabled on isolated recovery TEST` ; aucun relais SMTP exécuté |
| Secrets | Clés propres à la cible, accessibles uniquement dans les fichiers privés ; aucun mot de passe, JWT, hash source, clé de production ou lien signé complet dans les preuves diffusées |
| Coûts | Aucun upgrade, service payant, nouveau projet supplémentaire ou prompt Lovable |

Le badge Supabase « main PRODUCTION » désigne la branche par défaut de ce **nouveau projet TEST indépendant**. Il ne désigne ni la production Nona ni la branche Git main, qui n'ont pas été modifiées.

## Reprise des services : preuves

Le schéma applicatif, les fonctions, contraintes, index, grants explicites et politiques sont restaurés sur PostgreSQL réel. Les schémas Auth et Storage restent ceux du service Supabase cible ; les données compatibles et personnalisations nécessaires y sont importées. La restauration des données est transactionnelle, puis les contraintes sont remises en place et validées.

| Composant | Résultat prouvé |
| --- | --- |
| Données restaurées | **815 lignes** issues de l'archive, avant ajout des fixtures TEST ; 202 lignes de sessions/tokens/historiques de migrations gérées volontairement exclues |
| Données applicatives | 30 tables public/drizzle : tous les nombres de lignes originales concordent ; 29 empreintes concordent exactement, la 30e diffère seulement du traitement volontaire des sessions voyageur |
| Auth restauré | 8 utilisateurs et 10 identités conservés avec leurs UUID et relations ; mots de passe et tokens source neutralisés ; contrôle SQL : aucun ancien hash de mot de passe présent |
| Auth opérationnel | 5 identités synthétiques `example.invalid` créées par API administrative sans émission ; vrais logins, vérification d'identité et renouvellement de session via Auth Supabase |
| RLS | **46 politiques** public/Storage identiques après normalisation des espaces SQL ; aucune table publique avec RLS désactivé |
| Storage restauré | 2 buckets et métadonnées ; **9/9 fichiers**, **4 347 660 octets**, téléversés puis téléchargés depuis la cible ; SHA-256 identiques à la sauvegarde |
| Accès privé | Bucket guide-media privé ; accès propres autorisés, accès inter-organisations et anonymes refusés |
| Lien signé | Durée demandée 15 s ; téléchargement anonyme exact avant échéance ; HTTP 400 après échéance, `InvalidJWT`, `"exp" claim timestamp check failed` |
| Propriétaires existants | Les 9 rattachements/roles restaurés restent identiques ; seules les organisations et identités synthétiques servent aux essais |

Ce résultat est une **reprise Supabase réelle des services nécessaires**, distincte du précédent test PostgreSQL local 65 tables / 1 017 lignes. Ce n'est pas un clone de credentials ou une remise en service des intégrations externes de production.

Les 202 exclusions sont : sessions Auth 10, refresh tokens 26, one-time token 1, MFA AMR 10, versions internes Auth 82 et Storage 73. Les 8 anciens mots de passe/tokens et les 2 secrets de sessions voyageur sont neutralisés ; les sessions voyageur sont expirées. Aucune donnée n'est supprimée de la source. Les schémas/services gérés utilisent leurs versions cible, au lieu de recopier leur historique de migrations source.

Adaptations de privilèges : absence du rôle Lovable `sandbox_exec`, donc aucun rôle agent recréé ; grants explicites applicatifs restaurés ; `ALTER DEFAULT PRIVILEGES` source non importés pour conserver les protections natives et l'absence d'exposition automatique des nouvelles tables. Le schéma drizzle est créé explicitement et protégé par RLS.

## Permissions et invitations avec de vraies sessions

**147/147 contrôles actifs PASS :** 41 Auth/invitations, 75 rôles/REST/RPC, 25 Storage/liens signés et 6 appels du helper applicatif `src/lib/team-access.ts` avec les JWT réels de la cible. Les accès métier utilisent les sessions utilisateur, et non la clé administrative utilisée uniquement pour l'installation des fixtures et les contrôles de conservation.

| Scénario | Résultat |
| --- | --- |
| Invitation avant existence du compte | Owner A prépare admin/member ; invitation pending ; création de l'identité TEST puis première entrée `ensure_my_organization` : A, bon rôle, invitation acceptée, aucun doublon |
| Identité existante sans organisation | Admission immédiate dans A ; pas de faux pending |
| Identité déjà dans B | Invitation dans A refusée ; aucun déplacement entre organisations |
| Owner protégé | Invitation/changement de rôle/retrait ne modifient pas son rôle ni son rattachement |
| Owner | Gestion d'équipe permise dans son organisation, refusée dans l'autre |
| Admin | Lecture/édition/création de contenus A permises ; gestion d'équipe et contenu B refusés |
| Member | Lecture A et conversation/message avec son propre sender permises ; création/édition de contenu, upload et gestion d'équipe refusés ; auto-promotion impossible |
| Isolation A/B | Lectures de données étrangères vides ; écritures, références croisées et signatures de médias étrangers refusées |
| Anonyme | Sept tables privées et téléchargements directs privés/publics/signatures de médias refusés |
| Changement de rôle | Le même JWT reflète immédiatement promotion puis rétrogradation ; après retrait du membre TEST, son accès au contenu disparaît |
| Handler applicatif | Helper du HEAD : owner A→A et B→B HTTP 200 ; admin/member sur équipe et owners sur équipe étrangère HTTP 403 |

Un premier assert du harnais attendait HTTP 200 pour une RPC `void` : Supabase renvoie normalement **204**. L'assert a été corrigé, puis l'état de l'invitation et son acceptation vérifiés. Cette entrée reste marquée comme remplacée dans le journal privé et n'est pas comptée comme un échec applicatif. Deux interruptions réseau ont été reprises seulement aux contrôles Storage manquants ; aucune requête interrompue n'a été assimilée à un refus RLS. Les cinq dernières réponses, dont l'expiration, proviennent réellement du service cible.

## Configuration et limites volontaires

- URL Auth cible `http://localhost:3000`, liste de redirections vide : aucune redirection vers Nona/source installée. La preview existante n'est pas repointée vers la cible.
- Google/OAuth et leurs secrets ne sont pas copiés. La protection de mots de passe divulgués n'est pas activée sur le plan Free ; cet écart est consigné, aucun upgrade réalisé.
- Ni Functions financières, ni jobs, ni alertes/e-mails externes réactivés. La recette ne prouve pas le redéploiement de ces intégrations de production.
- Les identités synthétiques sont confirmées administrativement uniquement sur TEST. Le mécanisme d'invitation/consommation et les droits sont prouvés ; la livraison d'un e-mail de confirmation ou d'invitation ne l'est pas et reste volontairement désactivée.

**Invitations V1 :** la fonctionnalité prépare l'accès par adresse et le consomme à la première entrée du compte correspondant ; elle n'envoie pas d'e-mail automatique. Solution existante la plus simple : owner prépare l'accès puis partage manuellement le lien d'inscription Nona ; le membre utilise exactement l'adresse invitée. Ne pas promettre un lien d'acceptation à usage unique ou une migration entre organisations.

## Preview, corrections et Git

Code validé : **`126f863a778ab98d02e52ec2fe2f0c6c400419c5`**, branche `feat/guest-guide-v2-lot1`.

Empreinte du runtime HTML observée : `3267de3fed9336eee86ff6d832c0d4dc6927eb09065361b29085627b2dda55cc`, identique aux 312 entrées du manifeste du checkout propre. Les champs revision/state restent `unknown` car Git n'est pas exposé au builder. La correspondance des fichiers compilés est donc prouvée ; la configuration extérieure et les données ne sont pas incluses dans cette empreinte.

Les essais de cette passe sont des appels Auth/REST/Storage réels et l'exécution du helper applicatif sur la cible isolée. **Aucune recette complète de l'interface authentifiée de la preview reliée à la source n'est revendiquée.** Aucune nouvelle correction applicative n'est nécessaire : aucun bug démontré. Les corrections d'affichage d'équipe et de provenance de build déjà acquises sont conservées, sans relancer leurs audits ni les tests financiers.

La mise à jour Git de cette passe porte uniquement sur ce rapport et les résultats anonymisés. Elle conserve la même empreinte des sources et utilise `[skip ci]` afin de ne pas déclencher les anciens tests financiers exclus par la demande. Aucun merge main ni déploiement production.

## Obstacles restants et prochaine priorité

**Aucun blocage restant pour cette restauration TEST et la matrice de permissions exécutée. Aucune action humaine supplémentaire n'est nécessaire pour les clore.**

Le verdict global de lancement demeure **NO-GO**, sur les éléments déjà recensés et non réaudités ici : automatisation des sauvegardes médias/configuration et objectif de délai de reprise ; réception d'une alerte critique inoffensive ; recette mobile authentifiée (publication/médias/QR) et mesure mobile du runtime courant ; validation des brouillons légaux et configurations de production. L'activation Connect TEST reste un blocage externe documenté, sans nouvelle tentative. Les paiements et Billing TEST acquis ne sont pas retestés.

**Prochaine priorité technique : terminer la preuve de réception d'une alerte critique et la sauvegarde récurrente des médias/configuration ; puis recette mobile authentifiée sur environnement isolé.** Le canal/responsable d'alerte reste la décision opérationnelle déjà manquante, pas une condition ajoutée à cette reprise. Les confirmations juridiques antérieures restent à traiter avant commercialisation. Ne pas demander à nouveau l'identité de l'éditeur ou les tarifs déjà fournis.

## Références officielles consultées

- [Restauration d'un backup Dashboard](https://supabase.com/docs/guides/platform/migrating-within-supabase/dashboard-restore).
- [Restauration logique vers un autre projet Supabase](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
- [Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook) : un hook activé remplace l'envoi SMTP lorsque le provider Email est activé.
- [Privilèges des Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks) : autorisation de la fonction limitée à `supabase_auth_admin`.

Les relevés diffusés ne contiennent ni bundle, ni clé, ni credentials, ni adresse réelle, ni données client. Les captures montrent uniquement la cible TEST et les résultats/configurations non sensibles.
