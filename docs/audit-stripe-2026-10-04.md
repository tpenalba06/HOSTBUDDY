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

## Audit et niveau de preuve

| Domaine | Contrôles effectués | Limites |
| --- | --- | --- |
| Navigation / gestionnaire | Démo : logements, services, commandes, messages et conversation, retours, connexions, équipe | Données locales de démonstration, pas un test client réel |
| Guide / services | Ouverture du catalogue et demande en démo ; tests de composants partagés | Demande de réservation sans paiement immédiat ; le paiement suit une confirmation gestionnaire |
| Imports | Revue des adaptateurs, validation/provenance, sécurité URL, suite de tests extraction/texte/photos | Imports authentifiés réels non rejoués dans ce navigateur |
| Publication | Tests RPC, doubles clics, préservation médias/paramètres | Publication/republication réelle non rejouée pendant cette passe |
| Messages / commandes / retours | Revue endpoints, validation des corps, RPC serveur et anti-spam ; écrans démo ouverts | Envoi/réponse réels non rejoués |
| Authentification | Accès `/app` redirigé vers `/auth`, contrôle du middleware et des parcours de récupération | Login, Google, reset, logout/refresh à vérifier avec un compte connecté |
| Équipe | Tests unitaires propriétaire/membre ; RPC SQL réel avec contexte JWT propriétaire après correction | Envoi des invitations e-mail non vérifié ; préparation d'accès n'est pas preuve d'envoi |
| Sécurité des commandes | Test SQL A/B : statut autorisé, prix et suppression refusés, insertion directe refusée, isolation entre organisations | Test ciblé ; ne constitue pas une certification de toutes les politiques de l'app |
| Registre Stripe | Test SQL réel : mauvais montant/compte rejetés, paiement conforme enregistré, doublon ignoré, événement tardif sans régression | Événements synthétiques, aucune transaction réseau Stripe exécutée |
| Médias / offline | Revue limites, upload, moteur vidéo navigateur, blobs IndexedDB et tests offline/intégrité | Pas de transcodage serveur prouvé ; perte de réseau et réouverture sur téléphone non rejouées ici |
| Internationalisation | Suite i18n ; les copies Stripe passent par les traductions | Plusieurs erreurs backend/offline sont encore rédigées en français |
| Performance | Build production ; SDK Stripe chargé côté serveur | Mesures réseau mobile/Lighthouse et matrice complète 360–1440 non réalisées |

## Tests

- `npm run check` : lint, 98 tests dans 22 fichiers, TypeScript et build production passent.
- 14 nouveaux tests : orchestration Checkout, signatures/scope Stripe et accès équipe.
- Signatures Stripe : payloads synthétiques signés par le SDK officiel, tampering refusé.
- SQL `scripts/validation/order-payment-integrity.sql` : fixtures isolées, événements synthétiques et changements de droits tous annulés par ROLLBACK.
- RPC équipe testé avec le JWT d'un propriétaire, sans modification de données.

## Base de données

Deux migrations ciblées ont été validées en transaction annulée puis appliquées :

- `0014_order_payment_integrity.sql` : restriction des privilèges des commandes ; retour arrière documenté dans le fichier.
- `0015_team_email_result_type.sql` : correction du type renvoyé par le RPC, contrôle propriétaire conservé.

Aucune donnée réelle supprimée, aucune réinitialisation, aucune modification de contenu ou de DA.

## Stripe — activation restant à faire

Le SDK et les routes étaient déjà présents. Cette passe les complète ; elle ne prouve pas un compte Stripe connecté.

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
- Parcours navigateur avec gestionnaire connecté : import, médias, publication, QR, republication, messages/commande/retour et droits.
- Invitations e-mail : livraison réelle à démontrer.
- Facturation SaaS : synchronisation des quantités si des logements sont ajoutés après souscription à contrôler avant activation.
- Vidéo : le moteur actuel optimise dans le navigateur ; transcodage serveur non démontré.
- Offline : validation physique sans réseau après fermeture/réouverture, notamment vidéo.
- Compléter les traductions des erreurs et la vérification responsive/performance sur les tailles demandées.

Conclusion : corrections et base Stripe prêtes pour validation ; commercialisation et encaissement Stripe ne sont pas déclarés validés.
