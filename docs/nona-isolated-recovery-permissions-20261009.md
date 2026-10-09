# Nona — reprise Supabase et sessions réelles, continuation du 9 octobre 2026

Base de travail : `508b935d6d3a0e956eb4c23fac768b6c29b92483`. Les preuves DB 65 tables / 1 017 lignes / 46 politiques et neuf médias intacts ne sont pas répétées et ne valent pas restauration de services Supabase. Aucun Stripe, Billing, déploiement, merge main, suppression ou mutation de la source.

## Cible recherchée et obstacle vérifié

- Inventaire Lovable : quatre projets, aucune cible dédiée Nona de reprise. Les autres projets sont des applications indépendantes ; aucun n'est réaffecté ou modifié.
- Aucun accès Supabase Management / URL DB de cible dans les variables disponibles. Pas de Docker/Podman ni socket Docker dans l'environnement.
- Une alternative officielle récente permet PostgreSQL 17, Auth, REST et Storage comme processus natifs, sans Docker. CLI officiel 2.120.0 installé dans un dossier séparé, configuration locale privée préparée : aucun projet distant lié, confirmation e-mail activée, SMTP local, Functions/Analytics exclus.
- Tentative unique de `supabase stack start --runtime native --preparation on-demand` : échec **avant préparation/démarrage de PostgreSQL**, car les deux hôtes officiels d'archives sont inaccessibles (`getaddrinfo ETIMEOUT github.com` et `getaddrinfo ETIMEOUT supabase-cli-artifacts.s3.us-east-1.amazonaws.com`). Aucune restauration effectuée. Pas de contournement réseau, pas de boucle ni d'escalade.
- Tableau de bord Supabase atteint, redirection vers une page de connexion : aucune organisation, cible libre ou place gratuite attestée. Ne pas confondre connexion Lovable et accès Supabase.
- Le plan Supabase Free permet deux projets actifs sous réserve du quota du compte ; un nouveau projet dans une organisation Pro serait payant. Aucun projet créé, remix Lovable, ressource payante ou prompt génératif.

Une stack locale avec les services réels aurait permis de prouver la reprise HTTP sans confondre le résultat avec PGlite. Elle reste une solution gratuite documentée, mais ne peut pas télécharger ses composants ici. La prochaine option est un projet Supabase Free dédié après accès au compte et vérification du plan/quota. Ne pas inventer un quota disponible ni demander la création d'un projet payant.

## Provenance du runtime

Le fournisseur annonce le HEAD de base synchronisé et `ready`. Ces métadonnées décrivent le projet ; elles ne prouvent pas à elles seules le commit exécuté par la preview.

Correction technique : `build/build-identity.mjs` lit le Git checkout réellement compilé et injecte deux métadonnées HTML globales :

- `nona-build-revision` : SHA Git complet, ou `unknown` si indisponible.
- `nona-build-state` : `clean`, `modified` ou `unknown`.

Aucun écran, parcours, donnée personnelle, clé ou endpoint métier ajouté. Les modifications staged, unstaged et nouveaux fichiers empêchent l'attestation `clean`. Si le builder n'a pas Git, la valeur reste `unknown` : aucune version n'est devinée à partir de l'URL ou des métadonnées fournisseur.

Cinq tests spécifiques passent : checkout propre, source modifiée, source staged, nouveau fichier, absence de Git. Lint et TypeScript ciblés et build sont vérifiés. Les recettes navigateur ne devront compter comme preuve du HEAD que si les métadonnées du document servi correspondent au HEAD distant et à l'état `clean`.

## Restauration : conditions de départ

1. Cible différente du projet source, nommée comme TEST/reprise, plan Free attesté et cible vide ou dédiée. Ne pas toucher aux autres applications. Vérifier son project ref par rapport à la source avant chaque action sensible.
2. Neutraliser les e-mails/SMS/OAuth externes, hooks, Functions, cron et webhooks avant tout import. N'installer ni secrets Stripe/Billing ni tâches financières. Sur stack locale : SMTP de capture sans relais. Sur cible hébergée : vérifier la configuration réellement utilisée, pas simplement omettre SMTP.
3. Conserver le dump et sa clé privés. Utiliser les canaux sécurisés du fournisseur pour accès et secrets ; aucune clé dans le dépôt public, sorties de tests, CI ou rapport.
4. Restaurer DB avec rôles/propriétaires adaptés au serveur cible et compatibilité des extensions/services vérifiée. Les exclusions du précédent test PGlite ne sont pas une recette de restauration complète Supabase.
5. Restaurer les tables Auth et vérifier un compte TEST par une session Auth émise par le service. Préférer de nouvelles clés JWT locales/cibles : ne pas recopier les secrets de signature ou sessions valides de la source. Les anciens JWT ne doivent pas être acceptés sur la cible.
6. Restaurer les neuf octets Storage par l'API / outil officiel vers le bucket privé et les chemins exacts ; gérer la cohérence métadonnées/octet sans créer des doublons. Vérifier les SHA-256 après téléchargement depuis la cible.
7. Vérifier Auth et Storage via HTTP, politiques, refus anon/autre organisation, URLs signées et expiration. Ne pas déclarer PASS sur la seule présence de tables ou fichiers.

## Matrice préparée pour les sessions TEST

État : **NON EXÉCUTÉE**, faute de cible accessible. Les tests SQL antérieurs ne sont pas relancés et ne sont pas présentés comme cette preuve HTTP.

Préparer owner A et owner B ainsi que admin A et member A sur la cible isolée. Les propriétaires restaurés existants ne sont ni déplacés ni rétrogradés. Créer uniquement des identités synthétiques dédiées à la recette ; pas d'identité réelle, de JWT fabriqué ou de rôle Auth global utilisé comme rôle d'organisation.

| Scénario                                        | Session réelle / opération                                                                                                               | Attendu                                                                                                                            |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Auth                                            | Connexion et renouvellement de session par Auth cible                                                                                    | JWT émis et vérifié par Auth cible, identité correcte, aucune émission externe                                                     |
| Invitation nouvelle identité                    | Owner A prépare admin/member pour adresse synthétique avant création ; identité vérifiée sur cible puis première entrée app / RPC ensure | Même organisation A, bon rôle, invitation marquée acceptée, aucune organisation supplémentaire                                     |
| Invitation identité existante sans organisation | Owner A prépare l'accès                                                                                                                  | Ajout immédiat à A, aucun faux statut pending                                                                                      |
| Propriétaire protégé                            | Invitation, changement de rôle ou retrait ciblant owner existant                                                                         | Refus, owner et organisation inchangés                                                                                             |
| Identité déjà dans B                            | Owner A tente de l'inviter                                                                                                               | Refus, aucun déplacement B→A                                                                                                       |
| Owner                                           | Lecture et commandes équipe dans A                                                                                                       | Autorisées ; jamais dans B                                                                                                         |
| Admin                                           | Lecture/édition/publication des contenus A                                                                                               | Autorisées ; gestion équipe refusée                                                                                                |
| Member                                          | Lecture A et opérations prévues (messages/commandes/retours)                                                                             | Autorisées selon politiques ; création/édition/publication/équipe refusées                                                         |
| Isolation A→B / B→A                             | REST, RPC et handlers app pour ID explicite de l'autre organisation                                                                      | Lecture vide/refus et mutations refusées, aucune donnée étrangère ni modification                                                  |
| Anonyme                                         | Tables privées, bucket privé et téléchargement direct                                                                                    | Refus ; seules RPC publiques prévues pour guide publié restent accessibles                                                         |
| Médias privés                                   | JWT A sur fichiers A/B, JWT B sur fichiers A/B                                                                                           | Accès de son organisation seulement ; contrôler le refus d'écriture et de signature étrangère                                      |
| Liens signés                                    | Signature autorisée, téléchargement avant/après échéance courte                                                                          | Fichier exact avant expiration ; refus après expiration. Un lien signé est volontairement utilisable sans session jusqu'à échéance |
| Configuration                                   | Domaines/redirects, confirmation e-mail, providers et clés cible                                                                         | Cible isolée, absence de secret source et de relais externe ; éventuels écarts consignés                                           |
| Preview                                         | Document servi avant recette                                                                                                             | SHA distant actuel + `clean`, sinon résultats non représentatifs du HEAD                                                           |

Collecter codes HTTP, actions et verdicts sans mots de passe, JWT, liens signés complets, e-mails réels ou détails du bundle. La preuve d'accès par JWT utilisateurs est distincte des opérations d'administration nécessaires à l'installation des fixtures.

## Invitations V1 : limite distincte des permissions

Le système n'envoie aucun e-mail d'invitation. Il prépare une invitation par adresse et consomme celle-ci à la première entrée d'un compte correspondant ; pour un compte existant sans organisation, il ajoute immédiatement l'accès. La formulation actuelle annonce cette limite.

Solution V1 la plus simple : owner prépare l'accès, partage manuellement le lien d'inscription de Nona et demande au membre d'utiliser exactement l'adresse invitée. Ne pas promettre une livraison e-mail, une acceptation explicite par lien à usage unique ou un changement d'organisation qui ne sont pas implémentés. La validité des permissions peut être prouvée indépendamment de l'envoi e-mail.

## Une seule intervention nécessaire maintenant

Se connecter au tableau de bord Supabase dans la session sécurisée afin de vérifier les organisations, le quota Free et une cible TEST dédiée. La page de connexion annonce des conditions contractuelles : aucune acceptation automatique n'est effectuée. Après cet accès, vérifier ou préparer la cible gratuitement avant toute restauration ; ne pas demander au propriétaire de manipuler SQL, bundle ou clés.

Sources officielles : [runtimes Docker/natif](https://supabase.com/docs/guides/local-development/docker-and-native-runtimes), [stack isolée et CLI minimale 2.119](https://supabase.com/docs/guides/local-development/running-multiple-local-projects), [quota Free et coûts par organisation](https://supabase.com/docs/guides/platform/billing-on-supabase).
