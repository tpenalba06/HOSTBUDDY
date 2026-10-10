# HostBuddy — consolidation du 4 octobre 2026

Le projet Lovable actuel et sa DA restent la base. Ce rapport complète l'audit précédent ; il ne constitue pas une validation de mise en production.

## ✅ Testé

- Calcul du tarif : 0–1 logement non archivé = gratuit ; 2 = 9,99 €/mois ; 3 = 12,98 € ; 5 = 18,96 € ; 10 = 33,91 €. Brouillons et logements publiés comptent, logements archivés exclus.
- Tests automatisés du rapprochement Stripe avec SDK simulé : quantités, archivage/restauration, retour gratuit, sessions périmées, refus de prix incorrects, commission, remboursements et vérification du montant de commission reçu par webhook.
- Migration additive 0016 exécutée sur la base après tests transactionnels annulés : comptage, bail exclusif, modification concurrente, retry, droits privés et contrainte de commission. Aucun reset de base ni suppression de données réelles.
- Parcours gestionnaire réel sur le logement fictif AUDIT HostBuddy 04-10-2026 : création/import texte, édition, couverture, publication, modification Wi-Fi, republication et consultation du guide actualisé. Session authentifiée conservée après refresh.
- Service fictif à 15 € : demande voyageur reçue et confirmation côté gestionnaire, sans paiement.
- Retour privé fictif reçu côté gestionnaire.
- Messagerie réelle : message du voyageur fictif reçu côté gestionnaire, réponse envoyée et affichée dans le guide voyageur.
- Nouveau code de tarification observé dans le preview intégré Lovable. Guide réel ouvert en cadre mobile 393 × 852 px et en desktop. Cela ne remplace pas un test sur téléphone physique.
- Tests d'extraction du nom explicite et des identifiants Wi-Fi : conflits conservés pour vérification, ponctuation conservée, aucune information inventée. Les anciennes chaînes ambiguës restent intactes.

## Changements effectués

- Offre gratuite pour un logement, abonnement unique à deux logements inclus, puis 2,99 € par logement supplémentaire.
- File privée de synchronisation du nombre de logements ; rapprochement à la création et pendant la session gestionnaire ; endpoint serveur protégé pour un scheduler externe.
- Commission HostBuddy de 2 % sur les nouveaux paiements de services, figée dans le registre. Consentement requis avant Connect ; frais Stripe distincts. Les anciennes transactions ne sont pas modifiées rétroactivement.
- Vérification du montant réel de commission avant de confirmer un paiement via webhook. Remboursement total prévu avec remboursement de la commission.
- Photos des services sélectionnables parmi les images du logement autorisées et signées ; aucune URL arbitraire privée exposée.
- Actions discrètes de message, appel et itinéraire selon les seules données existantes ; composition desktop des pages internes avec média lorsque disponible.
- Renderer partagé conservé entre vrai guide, aperçu et démo ; aucune nouvelle navigation parallèle.
- Corrections découvertes pendant le contrôle visuel : titres système selon la langue active, titres personnalisés et contenu original préservés ; carte Services à hauteur adaptable pour ne pas couper le CTA ; progression et erreurs offline localisées.
- Le parser Wi-Fi accepte les libellés explicites sans deux-points, notamment « Wi-Fi : réseau … ; mot de passe … ». Il conserve la ponctuation du mot de passe au lieu de deviner.

## 🟠 Implémenté, à tester réellement

| Domaine | État précis |
| --- | --- |
| Abonnement Stripe | Calculs et orchestration testés avec doubles ; pas de subscription Stripe réelle vérifiée. |
| Connect et commission | Direct charges, consentement, 2 %, webhook et remboursement implémentés ; pas de paiement Stripe test ni remboursement réseau validé. |
| Synchronisation automatique | Outbox privée et endpoint implémentés ; scheduler externe et secrets non configurés. Les retries après fermeture du gestionnaire nécessitent ce scheduler. |
| Photos des services | Modèle, validation d'appartenance, sélection et affichage implémentés ; parcours complet du nouveau sélecteur non vérifié avec compte connecté sur le nouveau preview. |
| Équipe | Contrôles de rôle/RLS précédemment testés ; invitation, réception email et acceptation réelles non vérifiées. |
| QR | Affichage réel du code et de son URL vérifié. Tentative PNG : attente du téléchargement expirée dans le navigateur de test ; fichier et scan physique non validés. |
| Responsive | Cadre 393 px et desktop observés ; toutes les tailles demandées et appareils réels ne sont pas validés. |

## ❌ Non terminé

- Sauvegarde offline : tentative réelle dans le preview intégré, message « téléchargement indisponible ». Cause exacte non établie. Perte complète de réseau, fermeture/réouverture et lecture vidéo hors réseau non validées. Ne pas commercialiser cette promesse comme vérifiée.
- Transcodage vidéo automatique serveur : pas de test réel attestant un pipeline opérationnel.
- Imports URL Airbnb/Booking/Sunver : compatibilité réelle de chaque plateforme et droits d'utilisation des photos non validés dans cette passe.
- Stripe en mode test : manque la configuration externe du compte, des prix et des webhooks. Les encaissements live restent verrouillés.
- Publication production : non effectuée. Le preview externe historique peut servir une version antérieure à celle visible dans l'éditeur Lovable.

## Configuration externe requise

Configurer les secrets uniquement dans l'environnement serveur, jamais dans le chat ou dans le frontend : STRIPE_SECRET_KEY en mode test, HOSTBUDDY_APP_URL, STRIPE_CONNECT_WEBHOOK_SECRET ; pour l'abonnement, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_BASE (9,99 € EUR/mois), STRIPE_PRICE_EXTRA (2,99 € EUR/mois).

Configurer BILLING_SYNC_SECRET puis un scheduler serveur qui appelle POST /api/billing-sync avec le secret selon le mécanisme documenté dans le code. Vérifier reprise, erreurs et changements de quantités avant lancement. Ne passer STRIPE_LIVE_VERIFIED à true qu'après preuve complète : onboarding, paiement test, réception webhook, commission exacte et remboursement test.

## Risques et limites

- Un build vert ne prouve ni les transactions externes ni l'indépendance au réseau.
- Les anciens prix Stripe doivent être rapprochés explicitement ; un prix étranger est refusé, pas converti aveuglément.
- Les navigateurs peuvent supprimer des données locales sous pression de stockage.
- Les captures finales du dernier commit reçu par Lovable confirment le CTA Services visible à 393 px, les titres anglais Arrival/Departure et la séparation réelle du réseau HB_AUDIT_V2 et du mot de passe en desktop. Les captures intermédiaires ne servent pas de livrable final.
- Aucun compte de voyageur réel contacté : tous les messages/commandes/retours de test concernent le logement AUDIT et des contenus fictifs.

## Tests

Commande de validation : npm run check (lint, Vitest, TypeScript, build production). Avant les derniers correctifs : 118 tests / 24 fichiers, CI verte. Après ajout de la régression des titres système : 119 tests / 24 fichiers réussis ; lint sans erreur, TypeScript et build production réussis. Les 17 avertissements react-refresh préexistants ne sont pas des erreurs de lint.

Preview à utiliser pour contrôler la version synchronisée : https://lovable.dev/projects/ad0b09fe-b134-491b-8601-9d64d6d27b86 — onglet Aperçu. Éviter d'assimiler l'ancien lien externe à une preuve de déploiement du dernier commit.
