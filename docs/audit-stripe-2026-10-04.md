# HostBuddy — audit et démarrage Stripe, 4 octobre 2026

Base : dernier polish Lovable `08389671c0ff3bdf95288cf2f212e918a8e2f5f6`.
La direction artistique et les composants visuels ont été conservés.

## Corrections livrées

- Lint : formatage du fichier de types Supabase régénéré ; 1 081 erreurs de formatage éliminées, 17 avertissements préexistants restent.
- Services Stripe : webhook Connect indépendant des secrets/prix de l'abonnement HostBuddy ; signatures vérifiées avec le SDK officiel et séparation des événements plateforme/compte connecté.
- Checkout : une session ouverte est réutilisée ; une session expirée est renouvelée avec une clé d'idempotence stable ; une session terminée n'est pas recréée pendant l'attente du webhook.
- Paiements déjà payés/remboursés et commandes annulées : aucune nouvelle session créée.
- Webhook arrivé avant l'enregistrement du Checkout : rattachement initial contrôlé par identifiant, compte connecté, montant et devise.
- Événements d'abonnement des marchands connectés : ignorés par la facturation HostBuddy.
- Retour du voyageur : consultation du statut confirmé par le webhook pendant une minute environ, sans considérer le retour navigateur comme une preuve de paiement.
- Montants en euros inférieurs à 0,50 € : refusés par le serveur.
- Équipe : lecture par le client authentifié du propriétaire ; correction SQL du résultat e-mail (`varchar` vers `text`).
- Commandes : les clients authentifiés peuvent lire et modifier le statut dans leur organisation ; ils ne peuvent plus créer/supprimer directement les commandes ni modifier leur prix. La création voyageur reste serveur.
- Upload image : le message de progression annonce maintenant une photo, au lieu d'annoncer une vidéo ; traduction dans les six langues, sans changement de mise en page.

## Audit et niveau de preuve

| Domaine | Contrôles effectués | Limites |
| --- | --- | --- |
| Navigation / gestionnaire | Démo : logements, services, commandes, messages et conversation, retours, connexions, équipe | Données locales de démonstration, pas un test client réel |
| Guide / services | Ouverture du catalogue et demande en démo ; tests de composants partagés | Demande de réservation sans paiement immédiat ; le paiement suit une confirmation gestionnaire |
| Imports | Import texte réel avec propriétaire connecté : 7 informations trouvées, 11 manquantes ; correction/validation avant création ; pas de rubrique Piscine/Parking pour les mentions négatives | Imports URL des plateformes non rejoués ; le nom importé conservait le préfixe « Nom du logement : », corrigé manuellement à la validation |
| Publication | Création, édition, upload couverture, publication réelle, URL publique, QR affiché ; changement Wi-Fi, republication et nouvelle valeur visible après refresh public | Scan QR sur téléphone physique et mise hors ligne non rejoués |
| Messages / commandes / retours | Demande réelle de service fictif à 15 €, réception gestionnaire et confirmation ; retour privé synthétique reçu côté gestionnaire | Conversation aller-retour non rejouée pendant cette passe ; aucune transaction de paiement |
| Authentification | Connexion Google réussie sur le compte réel ; session conservée après rechargement de l'éditeur et de l'équipe | Création de compte, reset, logout/login non rejoués |
| Équipe | Tests unitaires propriétaire/membre ; RPC SQL réel avec contexte JWT propriétaire après correction ; page Équipe chargée dans la session réelle | Envoi des invitations e-mail non vérifié ; préparation d'accès n'est pas preuve d'envoi |
| Sécurité des commandes | Test SQL A/B : statut autorisé, prix et suppression refusés, insertion directe refusée, isolation entre organisations | Test ciblé ; ne constitue pas une certification de toutes les politiques de l'app |
| Registre Stripe | Test SQL réel : mauvais montant/compte rejetés, paiement conforme enregistré, doublon ignoré, événement tardif sans régression | Événements synthétiques, aucune transaction réseau Stripe exécutée |
| Médias / offline | Upload réel d'une image sur le logement fictif, fallback remplacé dans l'aperçu et couverture conservée sur le guide public ; revue vidéo/IndexedDB et tests offline/intégrité | Réorganisation/remplacement/suppression non rejoués ici ; pas de transcodage serveur prouvé ; perte de réseau et réouverture sur téléphone non rejouées |
| Internationalisation | Suite i18n ; les copies Stripe passent par les traductions | Plusieurs erreurs backend/offline sont encore rédigées en français |
| Performance | Build production ; SDK Stripe chargé côté serveur | Mesures réseau mobile/Lighthouse et matrice complète 360–1440 non réalisées |

## Tests

- `npm run check` : lint, 98 tests dans 22 fichiers, TypeScript et build production passent.
- 14 nouveaux tests : orchestration Checkout, signatures/scope Stripe et accès équipe.
- Signatures Stripe : payloads synthétiques signés par le SDK officiel, tampering refusé.
- SQL `scripts/validation/order-payment-integrity.sql` : fixtures isolées, événements synthétiques et changements de droits tous annulés par ROLLBACK.
- RPC équipe testé avec le JWT d'un propriétaire, sans modification de données.
- CI GitHub : deux exécutions vertes après la livraison des corrections Stripe/équipe/commandes.
- Navigateur réel desktop, viewport observé 1363 × 936 : Google → import texte → validation → création → couverture → service → publication → URL publique → demande → confirmation → édition → republication → retour privé. Aucun mock dans ce parcours.

## Données de validation conservées

Un nouveau logement explicitement fictif a été créé : `AUDIT HostBuddy 04-10-2026` (`0d0a4cec-a438-43a0-836a-55e34503e52b`). Il reste publié sur le preview pour inspection :

https://preview--host-buddy-concierge.lovable.app/l/audit-hostbuddy-04-10-2026-7ad333

Il contient une couverture issue de la bibliothèque HostBuddy, un service fictif à 15 €, une commande synthétique confirmée et un retour privé synthétique. Aucune prestation réelle et aucun encaissement. Aucun logement existant modifié ni donnée réelle supprimée.

Observation UX restante : le texte Wi-Fi importé apparaît comme une information complète sous « Réseau », plutôt que comme réseau et mot de passe séparés. Le contenu est conservé mais sa structuration peut être améliorée.

## Base de données

Deux migrations ciblées ont été validées en transaction annulée puis appliquées :

- `0014_order_payment_integrity.sql` : restriction des privilèges des commandes ; retour arrière documenté dans le fichier.
- `0015_team_email_result_type.sql` : correction du type renvoyé par le RPC, contrôle propriétaire conservé.

Aucune donnée réelle supprimée, aucune réinitialisation et aucun changement de DA. Seul le nouveau logement fictif a reçu du contenu de validation.

## Stripe — activation restant à faire

Le SDK et les routes étaient déjà présents. Cette passe les complète. La page Paiements du compte propriétaire connecté affiche réellement que les paiements ne sont pas activés ; aucun onboarding Connect n'est proposé tant que la configuration serveur est absente. L'accès au compte Stripe et ses secrets de test restent indispensables.

Configurer exclusivement dans les secrets serveur Lovable Cloud :

1. `STRIPE_SECRET_KEY` du mode test et `HOSTBUDDY_APP_URL` en HTTPS sur le domaine actuel.
2. Activer Stripe Connect pour la plateforme et créer l'endpoint des événements des comptes connectés sur `/api/stripe-webhook`.
3. Installer son secret de signature dans `STRIPE_CONNECT_WEBHOOK_SECRET`.
4. Connecter un gestionnaire test depuis Paiements ; vérifier les capacités, confirmer une demande, créer le lien, effectuer un paiement test, vérifier le webhook, tester expiration/doublon/remboursement et isolation A/B.

Les paiements de services ne nécessitent pas les prix d'abonnement. Les secrets `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASE` et `STRIPE_PRICE_EXTRA` concernent l'abonnement HostBuddy séparément.

Le flux actuel verse au compte Stripe du gestionnaire via des paiements directs. La commission HostBuddy reste à décider ; aucun pourcentage n'est ajouté arbitrairement. Les prix d'abonnement existants sont conservés.

Ne passer `STRIPE_LIVE_VERIFIED=true` qu'après validation complète. Les encaissements réels restent désactivés pendant cette préparation.

## Points restant à traiter

- Accès au compte Stripe et test d'une transaction réelle en mode test.
- Compléter les parcours : import URL, messages aller-retour, scan QR physique, mise hors ligne, rôles admin/membre en navigateur et récupération de compte.
- Import texte : retirer les préfixes du nom et séparer réseau/mot de passe lorsque les données sont explicites, avec tests de non-régression.
- Invitations e-mail : livraison réelle à démontrer.
- Facturation SaaS : synchronisation des quantités si des logements sont ajoutés après souscription à contrôler avant activation.
- Vidéo : le moteur actuel optimise dans le navigateur ; transcodage serveur non démontré.
- Offline : validation physique sans réseau après fermeture/réouverture, notamment vidéo.
- Compléter les traductions des erreurs et la vérification responsive/performance sur les tailles demandées.

Conclusion : corrections et base Stripe prêtes pour validation ; commercialisation et encaissement Stripe ne sont pas déclarés validés.
