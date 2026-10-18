# UX éditeur V1 — vidéo principale et sections

## État constaté avant cette passe

Le projet avait déjà `propertyMedia.presentationVideoId`, le stockage privé, la préparation vidéo navigateur, les limites média, progression/annulation, les URL signées, le renderer GuideView partagé et `sort_order` / `reorderGuideSections`. Les vidéos apparaissaient dans la galerie après les cartes du guide. L’éditeur présentait des vidéos sous les photos et proposait Monter/Descendre à l’intérieur de la section ouverte. `homeSections` réimposait un ordre par catégorie, indépendamment de la DB.

## Changements

- Zone générale : couverture puis bloc **Vidéo de présentation**, facultatif, visible avant la galerie. Sans vidéo : aide et ajout. Avec vidéo : player unique, durée lorsque les métadonnées existent, remplacement et suppression. Les contrôles existants de progression/annulation restent actifs.
- Sélection du remplacement après sauvegarde complète du nouveau média. Si upload ou sélection échoue, l’ancienne sélection reste intacte ; un échec de sélection nettoie uniquement le nouveau média. L’ancienne vidéo n’est supprimée qu’après sélection réussie de la nouvelle.
- Suppression : `presentationVideoId: null` distingue le retrait volontaire de la compatibilité ancienne. Une autre vidéo ancienne ne se substitue pas silencieusement à la vidéo supprimée. Les anciennes données restent lisibles sans migration.
- Guide : Cover → vidéo facultative → Services pleine largeur → sections. Les anciennes galeries photo restent accessibles plus bas ; la vidéo principale n’y est pas dupliquée. Aucun bloc voyageur sans vidéo prête/accessible.
- Même player et même GuideView pour vrai guide/preview/démo/homepage. Aucune vidéo indépendante ni nouvelle fixture factice ajoutée à Villa Mare.
- Player inline avec contrôles natifs, `playsInline`, sans autoplay, ratio intrinsèque, `object-fit: contain` et hauteur limitée. Validation réelle du ratio portrait/paysage reste à exécuter dans le navigateur.
- Organisateur vertical avec poignées 44 px ; drag & drop `@dnd-kit/core` / `sortable` / `utilities`, capteur Pointer (seuil 7 px), clavier et overlay. Auto-scroll fourni par la bibliothèque. `touch-action: none` seulement sur la poignée ; le reste de la liste garde son scroll normal. Menu secondaire Monter/Descendre disponible.
- Cover/welcome et Services sont fixes. Les sections éditoriales occupent les mêmes slots, puis leur `sort_order` est normalisé au drop. Les cartes voyageur suivent l’ordre sauvegardé, y compris les catégories anciennement reléguées dans « Toutes les infos ». DA et grille de cartes conservées.
- Sauvegarde au drop, preview optimiste, opérations verrouillées pendant la sauvegarde. Échec : rollback visuel et tentative de compensation des écritures partielles par l’API existante. L’API reste multi-écriture, pas transactionnelle ; une panne empêchant aussi la compensation impose un rechargement et reste signalée.
- Nouvelle copie interface disponible en français, anglais, espagnol, allemand, italien et portugais.

## Validation acquise localement

`npm run check` : 228 tests dans 41 fichiers ; lint zéro erreur / 16 warnings préexistants, TypeScript et build réussis.

12 tests supplémentaires et adaptation du test d’ancienne hiérarchie :

- rendu partagé sans vidéo : zéro bloc/player ;
- vidéo existante : un seul player après Cover, avant Services, inline sans autoplay ;
- retrait explicite : aucun fallback vidéo ni galerie vide ;
- bloc gestionnaire facultatif et unique ;
- remplacement réussi : sélection avant suppression ancienne ;
- upload échoué : aucun changement ni suppression ancienne ;
- sélection échouée : nettoyage nouvelle vidéo uniquement ;
- suppression : sélection principale explicitement retirée ;
- déplacement A → C avec slots fixes et conservation du tableau source ;
- ordre transmis par l’adapter commun au renderer public ;
- alternative accessible : sauvegarde unique, preview modifiée et remount à partir des données sauvegardées ;
- erreur sauvegarde : preview restaurée et compensation appelée ;
- poignées clavier uniquement sur les sections éditoriales.

Les tests d’interaction utilisent jsdom (dépendance de développement uniquement), actions simulées et, pour le suivi des changements de preview, un composant de test. Les tests de rendu utilisent le vrai GuideView et l’adapter commun. Cela ne constitue PAS un vrai test réseau DB ni une validation tactile.

## Validation navigateur préparée, NON exécutée

`scripts/e2e/editor-ux.mjs`, ajouté au workflow `Demo scroll browser checks` : 360 / 390 / 430 / 768 / 1440, drag souris et CDP tactile, clavier, menu secondaire, persistance sessionStorage démo après reload, ordre voyageur et galerie, absence de bloc vide, upload de vidéos synthétiques H.264/AAC paysage/portrait, remplacement, suppression, ratios et captures. Les URL de vidéos sont des blobs locaux de la démo, pas une validation Storage/RLS réseau. Le script passe le contrôle syntaxique ; ses assertions ne sont pas encore confirmées par un run navigateur.

Blocage local confirmé : Chromium `--version` termine SIGSEGV ; agent-browser quitte pendant le démarrage du daemon. Pas de screenshots ou de gestes annoncés réussis. Le workflow distant doit encore être poussé et exécuté. Le téléchargement/playback Android/iOS et la persistance DB authentifiée ne sont pas validés par cette passe.

## Synchronisation et suite

Référence distante lue : `09cc59a5c81bfb0ce5210749fe63565b614e66cd`. Comparaison du tree avec la base locale faite : les écarts sont les correctifs locaux précédents de scroll, le lien légal paiements et le suivi. Aucun changement distant concurrent de ces fichiers UX détecté.

L’ancienne revue automatique a refusé l’écriture dans ce dépôt public faute d’autorisation explicite user-authored de push. Pas de nouvelle tentative de contournement. Travail commité localement, aucun push ni déploiement production.

Après autorisation explicite de synchroniser cette branche publique : relire la ref, préserver les nouveaux commits, appliquer seulement les fichiers revus au-dessus de la ref, sans force push ; inclure les correctifs scroll déjà préparés. Vérifier Validate et Demo scroll browser checks, récupérer logs/captures, corriger puis rejouer tout échec. Vérifier ensuite le preview et le vrai éditeur authentifié (save/reload/publication avec logement test).

## Fichiers principaux

`PropertyMediaEditor.tsx`, `GuideEditor.tsx`, `SectionOrganizer.tsx`, `section-order.ts`, `PresentationVideo.tsx`, `GuideView.tsx`, `PropertyMediaGallery.tsx`, `property-media.ts`, `visual-library.ts`, styles gestionnaire/voyageur, `editor-copy.ts` / i18n, tests, scripts E2E, workflow, package.json et bun.lock.

Aucune migration, aucune production, aucun changement pricing/Stripe et aucun crédit Lovable consommé. Le transcodage reste côté navigateur ; aucun processeur serveur n’est revendiqué.
