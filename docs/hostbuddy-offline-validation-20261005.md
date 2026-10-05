# HostBuddy — reprise et validation du 5 octobre 2026

## Corrections livrées

- Le manifeste hors connexion contient désormais les identifiants des médias attendus. La vérification rejette les médias absents et les identifiants dupliqués, même lorsque la somme des tailles semble correcte.
- La couverture, les affiches vidéo et les photos de services sont sauvegardées comme fichiers locaux et restaurées par des URL blob. La couverture distante n'est plus conservée dans le guide téléchargé.
- Le texte de la liste hors connexion est disponible dans les six langues de l'interface ; les tailles utilisent le format localisé.
- Modification additive du format IndexedDB : manifeste optionnel, compatibilité avec les copies existantes, aucune migration de base ni suppression de données.

## Vérifications effectivement réalisées

- `npm run check` : lint sans erreur (16 avertissements existants), 126 tests dans 25 fichiers, TypeScript et build production réussis.
- Trois nouveaux tests : vidéo référencée absente ; références déclarées absentes ou identifiants dupliqués ; restauration locale couverture/affiche vidéo/photo de service et libération des URL blob.
- Sur le preview correspondant au commit 18a28d5 : téléchargement réel du guide de test AUDIT HostBuddy, affichage du succès, ouverture de la copie enregistrée, couverture issue d'une URL blob et consultation du Wi-Fi sauvegardé. Fermeture de l'onglet puis réouverture de la copie : les données et la couverture sont toujours présentes.
- Démo Villa Mare : affichage dans un cadre mobile de 390 px, couverture courte, grande carte Services et grille à deux colonnes ; cadre gestionnaire sans débordement (largeur client et défilable identiques). Modification de la photo principale côté gestionnaire, propagation côté voyageur, puis restauration de la couverture initiale. Messages et présentation desktop consultés.
- Captures : hostbuddy-continue-mobile.jpg, hostbuddy-continue-desktop.jpg et hostbuddy-continue-offline.jpg.

Ces observations navigateur précèdent les nouvelles protections d'intégrité de cette livraison, vérifiées par les tests automatisés. Le cadre mobile est une simulation dans le navigateur, pas un test sur téléphone physique.

## Non terminé

- Test avec réseau effectivement coupé, réouverture hors réseau de l'application et lecture d'une vraie vidéo sur Android/iOS : non réalisés. La fermeture/réouverture d'onglet prouve la persistance des fichiers, pas l'intégralité du démarrage hors connexion.
- Transcodage vidéo automatique côté serveur : infrastructure et test réel encore nécessaires.
- Stripe Connect et paiement réel en mode test : connexion au tableau de bord HOSTBUDDY confirmée après authentification Google. Le sandbox existant a été ouvert, le modèle de paiements directs configuré et un compte connecté fictif créé par Stripe. Ce compte indique encore paiements/virements suspendus. Le webhook Connect est préparé (quatre événements Checkout et charge.refunded) sans création définitive. Le coffre serveur Lovable ne contient aucun secret Stripe. Le raccordement de la clé du sandbox et du secret de signature nécessite confirmation avant de donner au backend cet accès. Checkout HostBuddy, frais de 2 %, livraisons des webhooks, doublons, expiration, remboursements et isolation restent à tester.
- Publication/QR sur téléphone, invitations email, parcours complets de récupération de mot de passe et contrôle exhaustif des rôles/multi-tenant dans l'interface : validation restante du backlog, non présentée comme acquise par cette passe.
- Aucun déploiement production ni certification de V1 prête à commercialiser dans cette livraison.

## Synchronisation

Le commit d73f0b1 est présent sur la branche GitHub reliée à Lovable ; Lovable annonce ce même SHA et le preview prêt. Les deux workflows CI ont terminé avec succès. Le formulaire de webhook cible uniquement le preview actuel /api/stripe-webhook, utilise les événements instantanés des comptes connectés et reste non enregistré. Capture complémentaire : hostbuddy-stripe-sandbox-preparation.jpg.

## Portée et retour arrière

La DA et les parcours existants sont conservés. Aucun paiement, reset ou effacement de données réelles n'a été effectué. Les changements de cette passe portent sur le frontend et les tests ; un revert du commit suffit pour revenir au comportement précédent, sans migration SQL. Les anciens snapshots restent lisibles grâce au champ optionnel.
