# Vidéo et hors connexion — reprise V1, 5 octobre 2026

## État vérifié dans le code et les tests

Le serveur produit par le build existant utilise Nitro `cloudflare-module` (voir `.output/nitro.json`). Il ne dispose pas d’un processus natif FFmpeg. Aucune conversion serveur n’a été installée ni présentée comme opérationnelle.

La conversion actuelle reste dans le navigateur du gestionnaire, par FFmpeg/WASM chargé à la demande : entrée MP4/WebM jusqu’à 50 Mio/90 secondes, sortie MP4 H.264/AAC jusqu’à 1280×720, 24 images/seconde et 20 Mio. Le moteur est exclu du manifeste de téléchargement voyageur. La vidéo locale est restaurée depuis les octets IndexedDB avec une URL blob, sans dépendance à une URL Supabase signée.

## Corrections de cette passe

- Le manifeste hors connexion inclut désormais les octets des photos et polices publiques dans son identifiant de version. Avant, remplacer un fichier à URL identique conservait la version et réutilisait l’ancienne image/police mise en cache.
- L’annulation d’un téléchargement hors connexion interrompt le lecteur du flux, même si le serveur ne fournit plus de nouveaux octets. Aucun fichier partiel n’est déclaré enregistré.
- L’upload média contrôle l’annulation avant/après préparation et validation, après transfert et après création de la ligne média. Un transfert annulé retire seulement le nouvel objet/sa nouvelle ligne et ne retourne pas ce média au composant chargé de remplacer l’ancien.
- La progression `uploading=100` est émise après sauvegarde effective, au lieu de précéder le transfert réseau. Le SDK Storage utilisé n’accepte pas d’AbortSignal sur `upload` : une annulation pendant cette requête attend sa résolution puis supprime le nouvel objet. Ce comportement ne constitue pas une interruption physique du transfert ni un upload reprenable.
- Le bouton Annuler reste disponible pendant le transfert ; après un clic, il reste désactivé pendant le nettoyage, et l’écran reste occupé pour empêcher une tentative concurrente. Dès que le nouveau média est sauvegardé et que commence sa sélection comme couverture/vidéo, le contrôle disparaît. Les erreurs connues de préparation/upload sont traduites dans les six langues et les erreurs inconnues ne sont plus reflétées directement à l’écran.

Aucune donnée existante n’est supprimée par ces corrections. Le nettoyage concerne exclusivement le nouveau chemin aléatoire de la tentative courante.

## Validation effectuée

Commande : `npx vitest run src/lib/data/media-upload.test.ts build/media-offline-plugin.test.ts src/lib/offline src/lib/media`.

Résultat initial : 6 fichiers, 29 tests réussis. Après ajout de la traduction des erreurs médias : 7 fichiers, 36 tests réussis. Les nouveaux cas couvrent remplacement photo/police à URL identique, déterminisme du manifeste, exclusion du codec, annulation d’un flux bloqué, annulation pendant préparation/transfert/création de ligne, progression avant/après envoi réel simulé. ESLint ciblé sur les fichiers modifiés/régressions et PropertyMediaEditor : aucune erreur. TypeScript global (`npx tsc --noEmit`) réussi avant intégration de la traduction, à rejouer dans la validation finale globale.

Ces tests sont des tests automatisés de logique avec doubles de stockage/navigateur. Ils ne prouvent ni une coupure réseau réelle ni un transcodage serveur. Aucun navigateur local utilisable n’est installé : Playwright indique que son exécutable Chromium est absent. Aucun navigateur externe n’a été installé pour contourner le navigateur cloud partagé.

## Blocages externes et suite exacte

1. **Hors connexion réel** : dans un navigateur permettant une coupure réseau, ouvrir un guide de test avec une photo et une vidéo H.264/AAC réelles, enregistrer jusqu’au succès, fermer l’onglet, couper le réseau, rouvrir `/l/<slug>` et vérifier redirection `/offline`, texte, photos, galerie, navigation et lecture/seeking vidéo. Répéter à 390 px puis sur Android/Safari iOS. Le test après simple fermeture/réouverture déjà effectué n’est pas une preuve de coupure réseau.
2. **Conversion serveur** : nécessite un worker d’encodage avec un runtime capable de lancer FFmpeg natif, ou un fournisseur vidéo réellement configuré. L’hébergement Cloudflare actuel seul ne suffit pas. Avant activation, provisionner un environnement de test de ce worker, sa file de tâches, ses secrets et son accès limité au bucket privé. Aucun fournisseur payant ni service externe n’a été créé.
3. Le worker devra accepter une référence privée organization/property/job, jamais un chemin ou une URL arbitraire du client ; authentifier l’appel, vérifier les droits du gestionnaire, imposer taille/durée/temps/CPU, analyser puis convertir avec le profil actuel, vérifier la sortie et changer la référence média seulement après succès. Conserver la vidéo précédente pendant `queued/processing/failed`, rendre l’annulation idempotente et utiliser une clé de tâche pour éviter les doublons. Les secrets restent serveur et les lectures publiques restent des URL signées.
4. Ajouter alors une migration additive de tâches et métadonnées avec RLS testée A/B, sans élargir les politiques publiques. Tester upload réel, timeout, échec codec, annulation, retry, remplacement, accès tenant et lecture mobile avant de modifier l’étiquette fonctionnelle en « transcodage serveur opérationnel ».
5. **Reprise upload** : le SDK actuel fait un upload simple. Ne pas annoncer la reprise d’un transfert ; un protocole de upload reprenable et un test d’interruption/reprise seront nécessaires si cette promesse est retenue pour la V1.

Prochaine étape autonome réalisable : intégrer ces changements, exécuter les contrôles globaux et pousser un preview. La validation physique offline et la conversion serveur restent explicitement non terminées.
