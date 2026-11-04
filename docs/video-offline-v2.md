# HostBuddy — vidéo et consultation hors connexion

## Livraison

La vidéo est convertie automatiquement **sur l’appareil du gestionnaire avant upload**, dans un worker FFmpeg/WASM chargé uniquement pour cette action. Ce choix utilise l’hébergement et le stockage privés existants, sans nouveau compte fournisseur ni envoi du fichier à un prestataire de transcodage. Aucun transcodage serveur n’est annoncé.

Entrée MP4/WebM, 50 Mio maximum, 90 secondes maximum. Analyse effective par ffprobe, H264/AAC, yuv420p, dimensions au plus 1280 × 720, 24 images/seconde, débit borné, métadonnées source supprimées et faststart. Résultat vérifié, 20 Mio maximum. Progression, annulation, délai maximal, worker terminé et URLs temporaires libérées. Une conversion échouée n’envoie pas la source et ne remplace pas la vidéo précédente. Les métadonnées de la sortie sont conservées dans le JSON existant de la section; aucun élargissement RLS ni migration destructive.

Le moteur (environ 31 Mio) est téléchargé uniquement par le gestionnaire lors d’un upload vidéo. Ses deux fichiers binaires restent sous la limite de taille par asset de l’hébergement. Il est exclu du téléchargement voyageur. Dépendances épinglées @ffmpeg/ffmpeg 0.12.15 et @ffmpeg/core 0.12.10; licence du core GPL-2.0-or-later et sources amont : https://github.com/ffmpegwasm/ffmpeg.wasm/tree/main/packages/core.

## Copie locale du guide publié

L’action « Enregistrer hors connexion » télécharge les octets complets des photos et vidéos visibles ainsi que les visuels HostBuddy et polices locales. Limites : vidéo 20 Mio/90 s; médias du guide 50 Mio; copies conservées 150 Mio. Les tailles sont contrôlées sur le flux réel même sans Content-Length fiable. Toute erreur, expiration d’URL, média absent, format refusé ou manque de quota empêche un faux succès.

Service worker pour le lecteur et les ressources statiques; IndexedDB pour le snapshot versionné et les blobs, transaction atomique, SHA-256 vérifiés avant stockage et après relecture. Les URL signées temporaires sont retirées du snapshot. La restauration fabrique des URL blob locales : lecture et déplacement dans la vidéo ne dépendent plus des signatures ou d’un réseau. Une actualisation interrompue conserve la copie précédente. Les téléchargements sont sérialisés entre onglets lorsque Web Locks est disponible; les caches interrompus/non référencés sont nettoyés.

Le lecteur `/offline?slug=…` réutilise GuideView, donc navigation, sections, galerie et contenu voyageur. Retour à un lien `/l/…` sans réseau : redirection vers la copie existante seulement. Aucun cache des pages gestionnaire, sessions, appels serveur ni réponses privées. Seule la copie volontaire du contenu déjà publié est conservée. Une dépublication ne peut effacer à distance une copie locale. « Mes copies » permet la suppression sur l’appareil; une actualisation reste explicite. Services/messages/retours expliquent qu’une connexion est nécessaire, sans envoyer ni mettre en attente une demande.

Le navigateur est sollicité via StorageManager.persist. Un refus ne transforme pas le stockage en mémoire : la copie reste sur disque, mais l’interface indique que le navigateur peut l’effacer si l’appareil manque d’espace. La suppression volontaire des données du navigateur efface naturellement les copies.

## Validation

Tests automatisés : limites et profil d’encodage; fichiers incomplets/corrompus; réponse 403; flux dépassant une taille déclarée incorrecte; annulation; ouverture de nouvelles connexions IndexedDB; reconstruction d’URL locales et nettoyage; remplacement atomique; service worker déconnecté simulé, guide non sauvegardé, exclusion back-office/API/POST. Contrôles locaux et CI : lint, tests, TypeScript, build.

Un logement distinct « Validation HostBuddy vidéo offline 03-10-2026 » a été créé dans le compte connecté pour vérifier aperçu brouillon puis publication réelle. Il contient seulement des données fictives de validation. Aucun logement existant n’a été modifié ou supprimé. Le fichier vidéo de test est une mire/signal sonore générés localement.

Limites : l’optimisation utilise les ressources du gestionnaire; un appareil trop limité affiche un échec et garde les médias précédents. Pas de garantie contre l’effacement volontaire ou l’éviction du navigateur quand le stockage persistant est refusé. Les parcours mobiles physiques Chrome Android/Safari iOS, coupure réseau réelle et redémarrage complet du navigateur nécessitent une vérification sur appareils; les tests de coupure réseau ici sont automatisés sur le service worker et la restauration locale.
