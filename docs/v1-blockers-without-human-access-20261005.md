# Clôture technique sans accès humain — 5 octobre 2026

Base vérifiée : `68d93995a6ed08d6e749e63c1350f3d671f00b92` sur
`feat/guest-guide-v2-lot1`. Aucun changement UX/DA, GuideView, drag, vidéo,
scroll ou marketing. Aucun appel Lovable, déploiement, merge, paiement Live,
email ou écriture sur une base hébergée.

## Migrations

Le journal référence maintenant les 21 SQL `0000`…`0020`, en ordre strict.
Les six entrées historiques sont conservées, et aucun SQL `0000`…`0019` n'a
été changé. `meta/manifest.json` fixe leurs SHA-256 ; `npm run check` vérifie
fichiers, journal et manifest. Cette validation n'applique aucune migration.

**Le journal du dépôt ET le ledger Drizzle de la base hébergée sont maintenant réconciliés.**
Lecture du catalogue hébergé le 6 octobre 2026 : le ledger ne contenait que `0000`…`0005`,
alors que les objets/fonctions/triggers/policies correspondant à `0006`…`0019` étaient bien
présents. Après vérification explicite de ces marqueurs de schéma, les hashes/horodatages exacts
du manifest ont été enregistrés dans `drizzle.__drizzle_migrations` sans rejouer les migrations.
Le ledger contient désormais **21 entrées (`0000`…`0020`)**. Ne jamais relancer aveuglément
`drizzle-kit migrate` sur un autre environnement existant : toujours vérifier son catalogue avant
réconciliation.

P1 identifié dans les quotas : `count` puis `insert` sans sérialisation peuvent
laisser passer plusieurs requêtes concurrentes. `0020_atomic_public_rate_limits`
ajoute un verrou transactionnel par fingerprint AVANT le comptage dans cinq
RPC de soumission. Il préserve corps, ACL, quotas et données ; réapplication
prévue idempotente. Aucune table ou policy ajoutée. Migration préparée, testée localement puis préflightée transactionnellement sur la base hébergée.
`0020` a ensuite été **appliquée à Supabase** : les cinq RPC publics contiennent le verrou
`HB_ATOMIC_RATE_LIMIT` avant le comptage et conservent leurs grants service-role-only.
Le test de charge parallèle distribué reste non prouvé ; l'application structurelle du verrou l'est.

Rollback `scripts/rollback/0020_atomic_public_rate_limits.sql` limité par opt-in
TEST et retirant uniquement le verrou. Il réouvre la course : préférer un
correctif en avant. Les rollbacks `0017`/`0019` ne sont pas un plan sûr de
production : ils réouvrent des failles ou le P0 des guides.

## Backup → restauration → vérification

Preuve exécutée : PostgreSQL **18.3 embarqué via PGlite**, schémas Auth/Storage
minimaux simulant les dépendances Supabase, identités et contenu fictifs.
Les 21 migrations sont exécutées sur une base neuve en mémoire.

1. Créer un logement, un propriétaire, du contenu et un objet Storage fictifs,
   puis publier via le vrai `publish_property` SQL.
2. Exécuter les assertions SQL publication, queue/retry, intégrité paiement
   (dont webhook dupliqué), équipe/RLS et quotas atomiques.
3. Exporter le datadir et un **vrai pg_dump WASM** des schémas public/auth/storage.
   Sauvegarder séparément les octets Storage fictifs et leurs checksums.
4. Fermer la source. Restaurer le datadir dans une nouvelle instance ; comparer
   données, RLS, policies, grants et définitions de fonctions, puis rejouer les
   assertions sous les rôles SQL concernés.
5. Restaurer indépendamment le dump SQL dans une seconde base neuve ; comparer
   le même fingerprint et rejouer les assertions. Restaurer `row_security=on`
   après les paramètres de session du dump, avant les tests de rôles.
6. Lire le guide publié sous le rôle `anon`, sans sujet gestionnaire.

Toutes ces étapes passent. Preuve : `docs/audits/local-recovery-20261005.json`.
La CI `Validate` exécute désormais cette procédure sans secrets externes.
Elle utilise les packages officiels épinglés PGlite 0.5.8 / tools 0.4.8 ; aucune
dépendance de production ajoutée. Un datadir PGlite n'est pas une archive
restaurable telle quelle dans Supabase. La preuve SQL est locale ; elle ne
prouve pas une restauration des services Auth/Storage hébergés.

Reproduction locale (packages de test hors dépôt) :

```sh
npm install --prefix /tmp/hb-recovery-tools --no-audit --no-fund @electric-sql/pglite@0.5.8 @electric-sql/pglite-tools@0.4.8
HOSTBUDDY_PGLITE_MODULE=/tmp/hb-recovery-tools/node_modules/@electric-sql/pglite/dist/index.js HOSTBUDDY_PGDUMP_MODULE=/tmp/hb-recovery-tools/node_modules/@electric-sql/pglite-tools/dist/pg_dump.js node scripts/validation/local-recovery.mjs
```

### Procédure réelle préparée, pas exécutée

- Accès source **lecture seule** pour inventaire, dump DB et export de tous les
  objets privés. Aucune suppression, restauration ou réplication sur la source.
- Utiliser la procédure officielle Supabase CLI : exports rôles, schéma,
  données, historique des migrations et personnalisations Auth/Storage. Les
  policies HostBuddy sur `storage.objects` doivent être incluses explicitement.
- Exporter séparément les fichiers du bucket privé `guide-media`, avec chemin,
  taille, MIME et SHA-256. Le dump DB ne contient que leurs métadonnées.
- Sauvegarder la configuration serveur, la configuration Auth (URLs de retour,
  SMTP/providers) et la liste des secrets séparément, chiffrées ; ne pas exporter
  les valeurs dans Git, un rapport ou un artifact CI public.
- Chiffrer le bundle hors dépôt, conserver checksums/date/version/outils et un
  lieu de sauvegarde restreint. Aucun abonnement ou PITR payant activé.
- Créer un environnement de restauration TEST distinct et vide, vérifier sa
  référence différente de la source, déconnecter mails/webhooks/scheduler et
  laisser Stripe Live absent. Restaurer selon la procédure Supabase adaptée à
  ses schémas gérés ; ne pas rejouer le dump intégral sur une base existante.
- Restaurer les fichiers privés ; vérifier les checksums, ACL et RLS, les deux
  tenants, publications et photos signées. Vérifier `get_public_guide` via rôle
  anonyme ; contrôler ensuite le vrai service Auth et les sessions HTTP TEST.
- Conserver les preuves et établir responsable, fréquence, rétention et délai
  de récupération avant de considérer le backup hébergé opérationnel.

Sources : https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore,
https://supabase.com/docs/guides/platform/backups,
https://pglite.dev/docs/api et https://pglite.dev/docs/pglite-tools.

## Monitoring, alertes et sécurité

Événements structurés `hostbuddy.operations.v1` ajoutés pour erreurs serveur,
webhook indisponible/échoué/mauvais mode, billing échoué/file restante. Champs
fixes seulement : événement, date, niveau et nombre pending. Aucun body,
URL, token, signature, exception ou donnée voyageur. Les erreurs internes
capturées ne sérialisent plus messages, stacks, causes ou objets arbitraires.
Les réponses restent génériques et un webhook échoué reste en 503/retry.

**Les signaux sont testés ; leur livraison à un destinataire externe n'est
pas configurée ni prouvée.** Aucun service payant ajouté. GitHub fournit déjà
l'état failed des workflows ; notification personnelle à activer dans
Settings → Notifications → System → Actions → On GitHub → Only notify for
failed workflows → Save. Les logs d'exécution serveur devront être reliés à un
canal d'alerte autorisé après accès à l'hébergement, puis testés avec une panne
fictive. Pas de nouveau endpoint public dévoilant les erreurs.

Sécurité revue et protections testées :

- Build refusé si une variable VITE contient un secret Stripe/Supabase ou un
  JWT service_role. Vérification aussi après chargement des fichiers `.env`
  par Vite. Scan des assets publics construits : zéro motif de secret privé.
- `nosniff`, `no-referrer` (liens de paiement/capacités), HSTS sur HTTPS,
  `no-store` sur auth/app/pay/API/server functions. Pas de CSP improvisée qui
  casserait médias ou previews ; le comportement d'embed est conservé.
- Auth middleware vérifie le JWT ; les guides passent par RPC publié ; RLS,
  rôles équipe et tables de capabilities sont testés dans PostgreSQL local.
- Endpoints Stripe public/legacy partagent signature et portée Connect/platform.
  Mode signé Live/TEST doit correspondre à la clé serveur avant traitement DB.
- Idempotence Stripe : clés stables pour checkout/refund ; RPC SQL refuse le
  second traitement du même événement et les régressions d'état.
- JSON/body public bornés, erreurs génériques ; quotas SQL de messages,
  commandes et feedback conservés et durcis par `0020`.

Limites : les fingerprints fondés sur les headers IP supposent un proxy de
confiance ; protection volumétrique/WAF et rate limit global du provider non
vérifiés. Les endpoints payment-info/checkout reposent sur un token aléatoire
256 bits et l'idempotence, pas sur un quota IP distribué spécifique. Pas de
revendication de test de charge/DDoS ou de certification sécurité complète.

## Lighthouse / réseau lent

Lighthouse 13.5.0, build production local servi par workerd, mobile et throttling
DevTools réellement activé : performance **79**, accessibilité **97**, bonnes
pratiques **96** ; FCP/LCP 2,3 s, TBT 600 ms, CLS 0,071. Preuve métrique :
`docs/audits/lighthouse-local-slow-network-20261005.json`.

Mesure limitée : Google Fonts inaccessible depuis le runtime ; un asset
`/__l5e/assets-v1/…` dépend du proxy d'hébergement et renvoie 404 localement.
Ces erreurs ne démontrent pas des ressources cassées sur le site publié.
Couleurs, images et composants non changés. Les mesures locales ne sont pas comparables directement au site hébergé.

La CI a exécuté deux audits anonymes du site actuellement publié, sans session
ni credentials, avec vérification préalable du véritable guide TEST. CI de
validation et récupération : https://github.com/tpenalba06/HOSTBUDDY/actions/runs/37388737037
Les changements de cette branche ne sont pas déployés : ce sont des mesures du
site existant, pas la preuve d'une amélioration après correctif.

| Page publiée | Performance | Accessibilité | Bonnes pratiques | LCP     | TBT    |
| ------------ | ----------- | ------------- | ---------------- | ------- | ------ |
| Accueil      | 53          | 97            | 100              | 11,78 s | 497 ms |
| Guide TEST   | 64          | 93            | 100              | 7,46 s  | 75 ms  |

Le premier audit donnait 11,75 s / 6,31 s : les mesures varient, mais la lenteur
est confirmée. Les rapports numériques détaillés sont conservés dans
`docs/audits/lighthouse-hosted-{home,guide}-slow-network-20261005.json`. Aucun
rapport brut, URL signée, contenu de page ou screenshot n'est publié.

Décomposition LCP du second audit :

- Accueil : TTFB 139 ms, attente avant requête image 584 ms, chargement image
  **11 026 ms**, rendu 27 ms. Rectangle 387 × 1431 : image principale.
- Guide : TTFB **2 298 ms**, attente image 37 ms, chargement image **5 102 ms**,
  rendu 23 ms. Rectangle 412 × 260 : couverture. L'image est déjà prioritaire.
- Lighthouse estime 1,17 Mo d'images évitables sur l'accueil et 404 Ko sur le
  guide ; feuilles de styles bloquantes également signalées. Ces estimations
  ne justifient pas de changer la DA ou les contenus des clients.

Correction technique minimale préparée : `fetchPriority="high"` et preload SSR
automatique pour
l'image principale de l'accueil, avec le même URL, dimensions et rendu. Aucune
modification de GuideView, photos, polices, CSS ou contenu marketing. Cela cible
la découverte/priorité réseau ; **aucun gain chiffré n'est revendiqué avant un
audit d'une preview déployée**. La latence serveur du guide et la livraison des
médias restent à vérifier avec accès à l'hébergement TEST et ses timings ; aucun
cache partagé de contenus signés ni transformation payante n'est activé.

Les alertes contraste/landmark sont documentées et laissées hors périmètre DA.

## Validation et matrice

Tests ciblés après chaque lot, puis `npm run check` : **257 tests / 46 fichiers**,
TypeScript/build réussis, lint zéro erreur / 16 warnings existants.

| État | Élément                                | Preuve ou action exacte                                                                                                                       |
| ---- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅   | Journal + intégrité des 21 SQL         | Contrôle automatisé et installation locale neuve                                                                                              |
| ✅   | Backup/restauration TEST               | Datadir et pg_dump SQL, checksums, rôles, guide anonyme                                                                                       |
| ✅   | Monitoring et garde-fous code          | Signaux sûrs, headers, mode webhook, guard frontend, tests                                                                                    |
| ✅   | Lighthouse/réseau lent local et publié | Deux audits anonymes CI, métriques et décomposition LCP conservées                                                                            |
| ✅   | État réel des migrations hébergées     | Catalogue lu ; `0006`…`0019` vérifiés par marqueurs réels ; ledger Drizzle réconcilié à 21 entrées                                          |
| ✅   | Protection quotas `0020`               | Préflight transactionnel puis application hébergée ; 5 RPC verrouillés avant comptage, grants préservés                                      |
| 🟠   | Backup réellement exploitable          | Donner accès lecture source DB/Storage et une cible TEST vide distincte ; choisir le lieu chiffré de conservation                             |
| 🟠   | Alertes reçues                         | Activer les notifications Actions ; autoriser un canal gratuit de réception des erreurs serveur                                               |
| 🟠   | Stripe/scheduler/Auth réseau           | Probe GitHub : scheduler désactivé car variable, URL et secret sont tous absents ; Connect/Auth nécessitent toujours accès TEST humain          |
| 🟠   | Performance après correction           | Déployer uniquement une preview TEST administrable ; vérifier priorité image, timings serveur/Storage et refaire un audit borné               |
| ❌   | Performance réseau lent publiée        | LCP 11,78 s accueil / 7,46 s guide ; priorisation préparée, lenteur restante non résolue                                                      |
| ❌   | Validation opérationnelle V1 complète  | Paiement/refund TEST, scheduler réel, Auth HTTP A/B et récupération Supabase restent non prouvés                                              |

**NO-GO technique V1 opérationnelle.** Le code prêt et les preuves locales ne
remplacent pas les validations externes. La lenteur en réseau lent est confirmée ; les accès TEST restent nécessaires
pour terminer la validation opérationnelle et mesurer les corrections. Aucun
retour du P0 « guide indisponible » observé pendant ces audits anonymes.
