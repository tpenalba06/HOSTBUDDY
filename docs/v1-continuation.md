# HostBuddy — suivi de continuation V1

Mise à jour : 2026-10-05. Source : branche Lovable `feat/guest-guide-v2-lot1`.
Dernier commit distant connu avant cette reprise : `ab0e4ec22d5f4af27303b68b2be6930e48683b10`.

## Règles

Conserver la DA, GuideView, ManagerShell et les données réelles. Mode Stripe test uniquement. Aucun déploiement final production autorisé. Modifications additives, petits commits, pas de force-push. Les validations précédentes restent acquises sauf régression ou changement concerné.

## Tâche actuelle

P1 : secrets Stripe enregistrés mais le preview affiche encore une configuration inactive. Vérifier une reconstruction du preview après ajout des secrets, puis comparer la disponibilité dans le preview compilé et dans le développement Lovable. Ne jamais afficher de valeurs de secrets dans les logs ou réponses.

## Déjà réellement validé

- Renderer voyageur partagé et source Villa Mare commune ; scroll gestionnaire corrigé.
- Publication authentifiée ; demandes de services, messages et retours privés.
- Persistance locale texte/images après fermeture et réouverture ; coupure effective de réseau non encore prouvée.
- 126 tests, lint sans erreur (16 avertissements préexistants), TypeScript et build réussis lors de la précédente passe.
- Sandbox Stripe `acct_1UMyq3PirDxaYw93` ; webhook connecté actif `we_1UN06zPirDxaYw93XwThoGCI` vers `/api/stripe-webhook` du preview ; événements Checkout completed/expired/async success/async failure et charge.refunded.
- Secrets serveur Lovable ajoutés : STRIPE_SECRET_KEY (test), STRIPE_CONNECT_WEBHOOK_SECRET, HOSTBUDDY_APP_URL. Aucune valeur dans ce fichier.
- Compte gestionnaire Google connecté ; après refresh, Paiements reste inactif. Aucun Checkout réseau complet réussi.

## Backlog, dans l'ordre

1. Stripe : visibilité runtime des secrets ; produits/prix Billing 999/299 centimes ; webhook plateforme séparé ; Connect/onboarding ; Checkout, SCA, erreurs, frais 2 %, remboursement, idempotence et isolation ; abonnement/portal et quantités.
2. Vidéo : pipeline actuel navigateur FFmpeg/WASM H264/AAC ; transcodage serveur absent. Vérifier upload réel, progression/annulation/lecture et infrastructure serveur disponible.
3. Offline : fermeture puis coupure effective du réseau puis réouverture et navigation, texte/images/vidéo.
4. Comptes/rôles : reset email, invitations fictives, owner/admin/member, tests RLS et routes A/B.
5. Imports : texte et URL autorisées, provenance et photos ; expliciter les plateformes bloquées.
6. Contrôle final renderer unique et source Villa Mare, sans refaire inutilement le travail validé.
7. Responsive 360/390/430/768/820/1024/1440 et écrans secondaires.
8. i18n système, contenus personnalisés préservés.
9. QR PNG réel et URL ; scan physique à distinguer du décodage automatisé.
10. PMS : uniquement adaptateurs vérifiables ; distinguer credentials/partenariat/stub.
11. Préproduction : tests, CI, rollback, backup, secrets, performance et verdict GO/NO-GO, sans déployer.

## Blocages externes

- Prix Billing et webhook plateforme non encore configurés.
- Onboarding Stripe/KYC et validation humaine éventuelle à isoler des tâches réalisables.
- Pas encore de fournisseur de transcodage serveur connecté ni test physique Android/iOS.
- Envoi à de vraies personnes interdit ; les emails de tests nécessitent une boîte de test réellement accessible.
- Pas de mécanisme démontré de reprise automatique après quota ; ce suivi permet une reprise au prochain lancement.

## Reprise exacte

1. Vérifier SHA GitHub/Lovable sans écraser des changements concurrents.
2. Après synchronisation de ce commit, recharger `/app/payments` dans la session gestionnaire ; chercher l'indication Mode test et le bouton Connect.
3. Si toujours absent, comparer le preview développement et le preview compilé ; vérifier les liaisons runtime plutôt que déplacer les clés dans le frontend.
4. Si une dépendance Stripe externe bloque, la noter ici et passer à la vidéo/offline. Ne jamais déclarer un parcours réseau terminé sur la seule base d'un test simulé.
