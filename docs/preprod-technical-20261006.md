# Lot technique pré-production — 6 octobre 2026

Base distante vérifiée : `473548cbc91b1824cd02a225e554f211c4c58f02`, branche
`feat/guest-guide-v2-lot1`. Aucun déploiement, appel Lovable, paiement, écriture
sur une base hébergée, modification UX/DA ou migration. Ledger et SQL existants
laissés intacts. GuideView, drag, vidéos et scroll inchangés.

## Performance : mesures hébergées, sans confondre code et déploiement

Lighthouse 13.5.0 mobile, throttling DevTools, accès anonyme au véritable guide
TEST. Preuves numériques sans URLs signées : `audits/home-20261006.json`,
`audits/guide-20261006.json`, `audits/hosted-network-20261006.json`.
Exécution : https://github.com/tpenalba06/HOSTBUDDY/actions/runs/37437711055.

| Mesure | Accueil | Guide TEST |
| --- | ---: | ---: |
| LCP précédent (5 octobre) | 11,78 s | 7,46 s |
| LCP actuel | 11,76 s | 6,58 s |
| Performance | 62 | 68 |
| TTFB dans la décomposition LCP | 113 ms | 1 408 ms |
| Attente avant requête LCP | 502 ms | 32 ms |
| Téléchargement image LCP | 11 118 ms | 5 127 ms |
| Rendu après chargement | 28 ms | 16 ms |
| Transfert images publiques, page entière | 1 324 614 octets | 403 955 octets |
| Transfert image privée signée | — | 103 263 octets |
| Transfert JS, page entière | 384 465 octets / 61 requêtes | 301 419 octets / 48 requêtes |
| Transfert CSS | 24 201 octets | 23 988 octets |
| Transfert polices | 297 429 octets | 140 828 octets |
| TBT | 241 ms | 34 ms |

La livraison des images domine le LCP ; concurrence avec les autres images,
fonts et scripts en réseau lent. Ce n'est pas un délai de rendu React dominant.
Lighthouse estime 1,17 Mo d'images évitables sur l'accueil et 404 Ko sur le guide.
La couverture privée fait 102 562 octets, WEBP, et répond réellement 200. La
mesure HTTP non bridée rapporte ~838 ms avant ses headers ; son Cache-Control
est absent. Le guide prend ~1,60 s avant headers lors de cette sonde ; cela ne
permet pas de départager SQL, signature Storage et hébergeur.

Le CSS propre à l'app répond gzip et `public, max-age=31536000, immutable` ;
les documents répondent gzip et `no-cache, must-revalidate, max-age=0`.
Les deux feuilles bloquantes sont signalées (~307/1576 ms sur le guide).
La couverture est déjà découverte rapidement/prioritaire ; ajouter un preload
supplémentaire n'est pas une correction démontrée. Aucun cache partagé de
snapshots/URLs signées n'est ajouté. Aucun token conservé dans les preuves.

**Ce ne sont pas des mesures après déploiement du correctif.** La sonde voit
encore TTF=true, WOFF2=false et ne détecte pas la priorité du hero préparée dans
la branche. Les écarts de scores/LCP sont de la variation de mesure. Aucun gain
hébergé n'est revendiqué. Les timings serveur ajoutés ne sont pas encore visibles.

Corrections prouvées dans le build : trois faces existantes converties sans
perte en WOFF2, 299 540 → 99 952 octets (-66,6 % avant compression HTTP), mêmes
contours de chaque glyphe, métriques et cmap. Preuve de hashes/équivalence :
`audits/font-woff2-equivalence-20261006.json`. L'offline ne télécharge plus leurs
TTF en doublon. Même typographie, tailles et contenu ; aucune photo réencodée.
Un essai de réencodage sans perte des WEBP était plus gros et n'a pas été retenu.
Les timings numériques `guide_snapshot` / `guide_media` permettront de séparer
RPC et signature sur une preview TEST. Le JS de DNS/extraction URL est désormais
dans un module explicitement serveur ; aucune réduction globale chiffrée du JS
hébergé n'est revendiquée.

## Médias publiés et imports

P1 trouvé : le signataire ne demandait que les chemins des sections. Une photo
de service indépendante, particulièrement sans média de section, devenait null.
Un seul batch dédupliqué signe maintenant sections ET services ; seuls les
chemins appartenant au logement peuvent être signés. Exceptions Storage : le
texte du guide reste disponible et un événement fixe est émis. Ordre et
métadonnées vidéo conservés ; TTL de signature inchangé (1 h).

Les imports ont un délai global partagé entre redirections, respectent le
délai robots plus court et bornent aussi un DNS qui ne répond pas. Une page HTML
de challenge à robots.txt ne vaut plus autorisation. Les exceptions de fetch
ne sont plus journalisées avec URL/stack ; événement fixe sans contenu.

Pipeline privé complet **non exécuté** : `/app` dans le navigateur cloud redirige
vers `/auth`, aucune session TEST gestionnaire disponible. Le guide TEST existant
s'affiche anonymement et après refresh ; cela ne prouve pas une nouvelle chaîne
import → Storage privé → brouillon → publication. Aucun média tiers ni logement
réel n'a été copié/modifié. Les tests SQL de publication restent synthétiques.

Le test réseau utilise une page JSON-LD fictive via le service HTTP public
httpbin et son JPEG de test, après contrôle robots. La première exécution a
échoué parce que la fixture utilisait Base64 URL-safe sans padding, incompatible
avec httpbin ; fixture corrigée en Base64 standard encodé dans l'URL. L'échec
initial n'était pas une panne du pipeline HostBuddy.

Relance corrigée réussie, CI https://github.com/tpenalba06/HOSTBUDDY/actions/runs/37438007196 :
vraie extraction réseau de **5 champs**, provenance JSON-LD vérifiée et JPEG de
**35 588 octets** lu/vérifié après robots. Les deux tests réseau passent, sans
mock DNS/fetch. Preuve : `audits/network-import-20261006.json`. La même relance
confirme les résultats fournisseurs ci-dessous. Aucune preuve Storage/publication
n'est déduite de ces tests. Validation complète et restauration synthétique CI
réussies au commit `cd6752596ba726a3602b4024735ece2bac666d76`.

Première sonde fournisseurs, une requête normale par pipeline, aucun bypass :

| Source | Robots | Importeur réel | Portée |
| --- | --- | --- | --- |
| Airbnb, `/rooms/14749668` | 200, autorisé | extraction réussie, 8 candidats photo | Pas de copie Storage ni publication |
| Booking, `/hotel/fr/negresco.html` | 200, autorisé | `insufficient` | Pas assez de champs exploitables ; ne pas appeler cela un succès ni inventer un CAPTCHA |
| Sunver, guide public demandé | 404, autorisé | extraction réussie, 1 candidat photo | Pas de copie Storage ni publication |

Fallback **Coller du texte** conservé ; extracteur déterministe et tests de texte
collé inclus dans les 275 tests. Pas de preuve d'une session UI complète du fallback.
Les photos réseau sont actuellement copiées telles quelles, maximum 5 Mo chacune,
8 candidats ; aucune optimisation généralisée ni ratio LCP acceptable après import
n'est prouvé. Un petit JPEG fictif ne peut pas prouver l'optimisation des grandes
photos. Pas de nouveau codec serveur ou service payant introduit.

## Backup hébergé, monitoring et audit

Avec les accès actuels : code/migrations publics à l'agent via GitHub, guide TEST
publié et sa couverture signée via accès anonyme. Aucun accès DB, service-role,
console Supabase, inventaire exhaustif Storage ou export Auth/config serveur.
Une URL signée de couverture n'est pas un backup du bucket. Le connecteur Vercel
accessible ne liste aucun projet HostBuddy parmi les projets retournés ; ne pas
utiliser les projets tiers ni supposer qu'ils hébergent cette application.

Procédure DB + octets Storage/checksums + Auth/config chiffrés + restauration
isolée déjà préparée dans `v1-blockers-without-human-access-20261005.md`.
CI a de nouveau prouvé le vrai pg_dump/restauration logique PGlite d'une base
fictive, assertions SQL et guide sous rôle anon. **Pas de restauration Supabase
hébergée** : aucune cible TEST distincte et vide disponible. Aucun export client
et aucune restauration sur la source.

Événements fixes `hostbuddy.operations.v1`, niveau/date/nombre pending uniquement :
serveur 5xx traité, exception/rejet non géré, snapshot/signature guide, import
source, webhook Stripe indisponible/échoué/mauvais mode, billing échoué/file
restante. Tests de déclenchement sans contenu sensible. Webhook signé mais sans
configuration répond maintenant 503 + événement, sans appel Stripe/DB ; retry
possible. Les événements de réponses 5xx normalisées ne sont pas émis deux fois
par le wrapper. Pas de nouveau endpoint de consultation des logs.

La réception d'alertes et les événements du runtime hébergé restent non prouvés,
faute d'accès à ses logs/configuration. Aucun service payant ajouté. Les tests
conservent les protections auth/RLS, signature et mode Stripe, idempotence,
refund fee, quotas atomiques, headers et contrôle secrets frontend. Ce passage
ne remplace pas le paiement sandbox, deux sessions Auth HTTP ou un test de charge
distribué. Aucun nouveau P0 indépendamment corrigible identifié au-delà des
correctifs documentés ; absence de certification globale.

## Validation et actions restantes

Tests ciblés : médias publiés, fetch/DNS/robots, offline/fonts, wrapper serveur,
événements, webhook et billing. `npm run check` : **275 tests réussis, 2 tests réseau
opt-in séparés**, TypeScript/build/smoke compilé réussis, lint **0 erreur / 16
warnings préexistants**. Le smoke SSR contrôle la priorité hero, les trois WOFF2
et zéro TTF en doublon offline. Migrations : vérification des 21 fichiers seulement.

| État | Élément | Preuve ou action exacte |
| --- | --- | --- |
| ✅ | Correctifs code sans UX | Médias services, frontière signataire, WOFF2 lossless/offline, délais imports, logs sûrs, monitoring 5xx |
| ✅ | Mesures réelles du site existant | Audits mobile anonymes, couverture HTTP 200, refresh navigateur, preuves numériques conservées |
| ✅ | Backup/restauration synthétique | CI pg_dump/restauration logique + assertions + rôle anon ; aucun client touché |
| 🟠 | Mesure après correctif | Fournir une preview TEST administrable de cette branche avec bindings TEST ; y déployer hors production, puis Lighthouse borné + Server-Timing |
| 🟠 | Import privé complet | Ouvrir une session gestionnaire TEST via login sécurisé du navigateur cloud ; fournir une source dont l'import/copie photos est autorisé ; créer un logement fictif et tester jusqu'à publication |
| 🟠 | Backup DB + Storage + Auth/config | Accès source lecture/export DB et bucket privé, lecture Auth/config ; choisir stockage chiffré et cible Supabase TEST distincte/vide, mails/webhooks/scheduler désactivés |
| 🟠 | Alertes réellement reçues | Accès logs de l'hébergement TEST et canal gratuit autorisé ; brancher les événements, injecter une panne fictive et vérifier réception ; activer notifications Actions failed dans GitHub Settings |
| ❌ | Performance hébergée lente | Images dominantes, TTFB guide encore élevé ; correctifs non déployés et compression générale des photos importées non résolue |
| ❌ | Validation opérationnelle hébergée complète | Nouvelle chaîne import/publication et restauration Supabase non prouvées ; paiements/scheduler/Auth réseau restent dépendants des accès TEST antérieurs |

**NO-GO technique opérationnel** tant que les preuves hébergées ci-dessus manquent.
Aucun changement production, merge main, crédit Lovable ou paiement effectué.
