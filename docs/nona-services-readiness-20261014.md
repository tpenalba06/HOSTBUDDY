# Nona — boutique de services, avant DA

Reprise du HEAD `89566dec544284c0456048e7aa53aec324b0dd5e`. Les services payants et la commission de 2 % restent obligatoires en V1. Aucun moteur financier réécrit, recette financière acquise rejouée, crédit génératif Lovable ou publication commerciale.

## Compléments fonctionnels réalisés

| Gestionnaire | Voyageur et serveur |
|---|---|
| Création/modification atomique et idempotente, activation/désactivation, retrait sans destruction des commandes | Catalogue actuel du logement publié ; retrait effectif sans nouvelle publication du livret |
| Attribution du même service à plusieurs logements de l’organisation | Contrôle organisation/logement obligatoire ; aucun service d’une autre conciergerie |
| Photo dédiée à chaque logement, sélection de médias existants et upload par la chaîne privée existante | URLs signées de la photo du logement, sans signer les médias privés d’un autre logement |
| Nom, description, prix EUR, forfait/unité ou personne, quantité maximale | Détail du service, choix d’option, quantité, montant affiché ; montant réellement calculé en SQL |
| Options avec supplément par unité et créneaux saisis dans des contrôles simples | Option/créneau vérifiés côté serveur ; pas de disponibilité ou de supplément inventés |
| Informations nécessaires, vendeur/contact, annulation/remboursement par prestation | Conditions visibles avant demande ; reconnaissance horodatée avec la commande et version du service contrôlée |
| Commandes en retard désormais visibles, détails/options/contact et paiement affichés séparément | Référence et suivi privé sans compte, retour à la même demande après erreur réseau, nouveau choix explicite pour une nouvelle demande |
| Compteur de demandes dans la navigation actualisé toutes les 30 s ; commandes actualisées toutes les 15 s | Confirmation du gestionnaire puis accès au lien émis depuis le suivi ; Checkout existant, prix de la commande et 2 % inchangés |
| Annulation séparée du remboursement ; remboursement conservé dans l’outil Paiements existant | Échec, expiration, remboursement et paiement explicitement distingués ; aucune confirmation de prestation assimilée à un paiement |

La suppression est un retrait réversible du catalogue (`deleted_at`), avec conservation du service, des demandes et du registre financier. Aucune suppression de données clients. Un service payé ne peut pas être terminé avant confirmation du paiement dans le nouveau parcours. Les conditions conservées avec la commande sont réaffichées sur la page de paiement.

## Validation nouvelle uniquement

- PostgreSQL local : création du gestionnaire, attribution multiple, isolation, options/quantités/créneaux, devis 25 € pour deux unités à 10 € + option 2,50 €, déduplication, suivi privé, désactivation et conservation des commandes. Nouvelle migration et fixtures intégralement transactionnelles ; aucun test des 147 permissions acquis.
- Six tests nouveaux : données de réservation et langues, formulaires gestionnaire/voyageur, erreur réseau/reprise identique, lien depuis reçu privé et raccordement au Checkout existant. Le SDK Stripe est simulé dans ce dernier contrôle : 2 500 centimes et commission 50 centimes, statut pending conservé.
- Cette preuve n’est **pas** un paiement effectué chez Stripe TEST. Le sandbox initial reste bloqué KYC ; ne pas recommencer son onboarding. Aucun compte, prix ou transaction Live créés.
- Validation sur backend TEST isolé préparée dans `docs/ops/nona-services-test.workflow.yml` : déclenchement manuel seulement, source immuable, accès TEST existants, TLS verify-full, migration 0023 puis fixtures nouvelles annulées par ROLLBACK. Ne jamais installer ce workflow dans un dépôt public ni le réaffecter au backend commercial.

## Limites explicites

Les créneaux sont des **demandes à confirmer**, pas un inventaire synchronisé ni une réservation automatique de capacité. Le gestionnaire confirme la disponibilité puis émet le lien de paiement. La confirmation durable et l’envoi par e-mail/SMS au contact fourni restent une opération du vendeur avec ses canaux existants ; aucun service d’envoi payant, notification push ou e-mail automatique n’est annoncé.

Une photo principale par service et par logement ; les photos supplémentaires du logement restent dans sa galerie. Options : supplément par unité ; aucun configurateur de tarification arbitraire ou stock par option inventé. Un remboursement n’est jamais déclenché par la seule annulation d’une prestation.

Le reçu privé est conservé sur l’appareil sans coordonnées du voyageur ; accès serveur limité à 30 jours, sans effacement des commandes. Un jeton perdu n’est pas récupérable par une simple adresse e-mail : demander au gestionnaire le lien de paiement ou la confirmation. Les liens de paiement ont leur expiration existante indépendante.

## Application commerciale après autorisation

Migration additive `0023_service_booking_catalog.sql` et code doivent être appliqués dans cet ordre à la cible commerciale seulement après accord. Aucun DDL métier commercial exécuté dans ce lot. Les lectures et demandes simples précédentes restent compatibles tant que le schéma n’est pas mis à niveau ; les nouvelles capacités nécessitent la migration.

Le vendeur renseigne ses coordonnées, disponibilité et conditions réelles, puis ses propres vérifications Stripe. L’éditeur approuve les textes ; DPA Lovable, fiscalité internationale et autorisations Live/publication restent les prérequis déjà identifiés. Le contrôle d’un vrai Checkout TEST exige un compte TEST effectivement capable et ses bindings autorisés ; les tests simulés ne ferment pas cette réserve.

DA globale inchangée : classes, composants et structure générale existants réutilisés. Les nouveaux champs et actions sont des compléments fonctionnels. Ne pas rouvrir PMS, traduction IA, sauvegardes fournisseur ou grand audit dans ce chantier.
