# HostBuddy V2 — cahier des charges médias

Statut : exigences acceptées le 3 octobre 2026. La DA voyageur est validée globalement ; consolidation et migration du gestionnaire autorisées. Voir `ux-consolidation-v2.md` pour le lot livré et ses limites.

## Expérience attendue

Chaque logement possède une couverture, une galerie ordonnée et une vidéo de présentation optionnelle. Les médias du logement sont distincts des médias d'une adresse ou d'un service. Couverture immersive plein écran, photographies recadrées sans déformation, galerie horizontale avec ouverture en grand, lecteur vidéo avec commandes natives, lecture inline sur mobile, sans autoplay et sans téléchargement complet à l'ouverture.

Gestionnaire, lot ultérieur : bloc « Médias du logement », grande couverture et bouton Modifier, galerie réordonnable en drag & drop avec alternative clavier/boutons, ajout/suppression/remplacement directs, sélection de la photo principale et aperçu immédiat dans le composant voyageur commun. Confirmation pour une suppression destructive, progression d'upload et erreurs récupérables. Aucun écran de cette refonte n'est commencé dans ce lot.

## Import et provenance

Import URL : récupérer uniquement les véritables médias disponibles et dont l'import est autorisé ; conserver source, droit d'utilisation, date et provenance. Réutiliser la protection SSRF, les contrôles robots et la validation humaine existants. Ne pas traiter une image trouvée sur Internet comme libre de droits.

Import texte ou sans photo : classer le logement (villa mer, hôtel urbain, chalet, glamping, appartement, campagne). En cas de signaux contradictoires, garder le choix non résolu et demander validation. Sélection déterministe dans un catalogue premium HostBuddy approuvé et licencié, sans génération à chaque import. Conserver assetId, catégorie et référence de licence. Mention discrète « Image d'ambiance » ; ne pas présenter cette illustration comme une photographie du bien. Une vraie photo disponible prend automatiquement priorité, même si une ancienne sélection d'ambiance existe. Pas d'images d'ambiance dans les galeries de vraies photos. Pas de faux lieux, distances ni équipements.

## Modèle et compatibilité

La configuration additive `content.propertyMedia` de la section `welcome` est versionnée : `version`, `coverId`, `galleryIds`, `presentationVideoId`, `essentialIds`, `fallback {assetId, mood}`. Les identifiants référencent exclusivement les médias publiés de cette section. Les anciennes sections et leurs médias restent lisibles. En l'absence de configuration, la première photo ordonnée sert de couverture ; toutes les photos et la première vidéo existante restent disponibles. Un identifiant absent est ignoré, sans masquer les médias encore valides.

Le contrat de média prévoit taille, durée, état de traitement (`uploaded`, `processing`, `ready`, `failed`), poster et révision. Ces informations doivent être produites côté serveur, jamais tenues pour vérifiées à partir des seules valeurs fournies par le client. Les chemins privés restent dans le stockage existant avec isolation organisation/logement ; les URL publiques sont signées par le chemin de lecture publié existant. Ne pas stocker d'URL signée expirante dans le manifeste durable.

## Vidéo : pipeline à connecter

Limites proposées : source 50 Mio maximum (limite d'upload actuelle conservée), durée maximale 90 secondes, dérivé mobile 720p MP4 H.264/AAC, fast-start, cible 20 Mio maximum pour le téléchargement hors ligne. Valider type réel, durée et taille sur le serveur. Produire poster, dimensions, durée, taille et hash/révision ; refuser ou demander de raccourcir si les limites ne peuvent être respectées. Ne jamais publier un statut prêt avant la fin réelle du transcodage. Job idempotent avec retries bornés, état d'échec clair et nettoyage des fichiers orphelins. Le service de transcodage n'est pas encore connecté dans ce lot.

## Hors connexion : contrat impératif du prochain lot fonctionnel

Le téléchargement explicite doit inclure le guide, l'interface, les polices locales, la couverture, les médias essentiels et le dérivé complet de la vidéo. Budget total proposé : 50 Mio par guide, taille annoncée avant lancement. Demander confirmation supplémentaire au-delà, jamais télécharger des vidéos silencieusement à l'ouverture. Aucun simple cache de navigation ou cache de fragments vidéo ne suffit.

- Service worker pour le shell et le rechargement offline ; IndexedDB/Cache Storage pour un snapshot versionné et les octets des médias, clés stables logement + média + révision, indépendantes des signatures temporaires.
- Télécharger vers une version temporaire ; vérifier chaque réponse, type, taille réelle et présence de tous les éléments essentiels ; ne promouvoir atomiquement la nouvelle version qu'après succès. Garder la version précédente intacte en cas d'interruption/quota/erreur. Reprise et bouton réessayer ; aucune réussite partielle annoncée comme complète.
- Vidéo : blob complet disponible, lecture et seeking offline via URL locale ou réponses Range correctes. Tester lecture après expiration des URL signées, redémarrage du navigateur et coupure réseau.
- `navigator.storage.estimate()` avant transfert et `persist()` si disponible. Le navigateur peut refuser la persistance ou effacer ses données : afficher l'état réellement vérifié, jamais promettre une conservation absolue. Revalider la disponibilité à chaque ouverture ; proposer « Réparer le téléchargement » et « Supprimer du téléphone ».
- États : non téléchargé, préparation, progression octets, prêt hors connexion, incomplet, espace insuffisant, mise à jour disponible. Ne pas afficher « disponible hors connexion » avant vérification des octets et de la version.
- Aucun cache des sessions, back-office, données d'autres organisations ou réponses privées. Le voyageur garde volontairement une copie locale du contenu publié : dépublication et révocation distante ne peuvent effacer une copie déjà téléchargée. Prévoir suppression locale et purge volontaire, pas de promesse de révocation offline.

## Livré dans le lot actuel

Contrat de données additif, sélection de couverture réelle prioritaire, galerie avec ouverture en grand, vidéo native et états prêts/en traitement pris en compte, classification déterministe du type de logement et contrôle de budget offline testés. Polices du guide locales. Les composants consomment les médias du chemin public existant.

Restent à implémenter et tester dans les lots fonctionnels suivants : sélection/import effectif du catalogue premium (aucun catalogue approuvé n'est injecté dans les vrais livrets), extraction des photos URL, pipeline de transcodage, remplissage serveur des métadonnées et téléchargement persistant avec service worker. Aucun bouton de téléchargement fictif n'est exposé. Les nouvelles interfaces du gestionnaire restent en attente.

## Critères de recette

Photo réelle remplace l'ambiance ; médias supprimés/réordonnés reflétés dans l'aperçu ; anciens livrets inchangés ; vidéo non prête non affichée comme traitée ; erreurs réseau/quota sans faux succès ; vidéo et images essentielles lisibles après coupure réseau et redémarrage ; reprise interrompue ; suppression locale ; tests Safari iOS et Chrome Android ; permissions inter-organisations conservées. Tests, TypeScript et build verts avant chaque publication.

## Consolidation UX autorisée et livrée

Le gestionnaire dispose désormais du bloc Médias du logement (couverture, galerie, photo principale, remplacement/suppression, drag & drop avec boutons de déplacement, vidéo et aperçu). Le catalogue d’ambiance généré est intégré et les imports URL peuvent copier les photos de métadonnées du logement après confirmation des droits. Le contrôle navigateur impose 90 secondes/50 Mio avant upload vidéo. Le transcodage serveur, les métadonnées vérifiées serveur et le téléchargement offline persistant restent à connecter ; le lecteur actuel ne promet pas ces capacités.
