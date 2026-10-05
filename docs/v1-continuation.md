# HostBuddy — reprise V1, 5 octobre 2026

## État et règles
DA préservée ; source actuelle GuideView/ManagerShell. Stripe sandbox uniquement, aucune production finale, aucun paiement réel, aucune suppression réelle. Dernier distant avant consolidation : 7f81db71265c960a6672f878129b59a2d7b04c47. Le commit contenant ce fichier est le checkpoint de reprise ; utiliser git log -1 pour son SHA local puis vérifier GitHub avant toute synchronisation.

## Livré et validé
- Secrets Stripe lus depuis les bindings Cloudflare de chaque requête, sans mélange de tenants ni clés frontend.
- Sandbox acct_1UMyq3PirDxaYw93 : tarifs mensuels 999 et 299 centimes créés et enregistrés dans le vault serveur.
- Base price_1UN6sgPirDxaYw93lEMzdaOy ; extra price_1UN6umPirDxaYw933fIdzbcB.
- Webhooks test actifs : Connect we_1UN06zPirDxaYw93XwThoGCI, Billing we_1UN72kPirDxaYw93Yp5EZkTH. Vault contient STRIPE_SECRET_KEY, STRIPE_CONNECT_WEBHOOK_SECRET, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_BASE, STRIPE_PRICE_EXTRA, HOSTBUDDY_APP_URL. Aucune valeur privée enregistrée ici.
- Migration 0017 validée dans une transaction annulée, appliquée à la vraie base preview puis tests rejoués : trois assertions fixtures/roles/isolation true. Fixtures fictives intégralement annulées. Rollback documenté et volontairement protégé car il réintroduit les failles.
- Annulation upload et nettoyage atomique, cache invalidé sur contenu des assets, gestion des téléchargements interrompus.
- QR protégé des races/changements de logement ; génération réelle PNG testée.
- Imports robots/redirections/provenance et équipements négatifs corrigés ; interfaces imports/QR/erreurs médias localisées ; PMS honnêtement classés.
- npm run check terminé avec succès : 178 tests, 35 fichiers ; TypeScript et build réussis ; lint 0 erreur, 16 avertissements préexistants.

## Blocages et validations restantes
- Lovable récupère le SHA runtime mais affiche Échec de la génération / aperçu non à jour. Build local et CI runtime passent. La cause backend Lovable n'est pas encore identifiée ; ne pas annoncer les corrections live.
- Session gestionnaire preview expirée : vrai Checkout/Billing/Connect/SCA/remboursements/2 % non rejoués. Aucun résultat réseau simulé présenté comme paiement terminé.
- Transcodage vidéo serveur absent (pipeline FFmpeg/WASM navigateur uniquement). Processeur externe à provisionner ; reprise upload non implémentée.
- Fermeture/réouverture texte/images déjà vérifiée auparavant ; vraie coupure réseau et vidéo hors ligne encore non prouvées.
- Signup/reset/email invitation et routes HTTP A/B avec deux sessions à rejouer ; SQL RLS réellement testé.
- Imports réseau plateformes, scan physique QR, captures de tous les viewports, Lighthouse/réseau lent, sauvegarde finale restent à faire.
- PMS nécessitent credentials/partenariats selon provider ; ne pas prétendre une connexion validée.

## Prochaines actions exactes
1. Vérifier git status et SHA distant ; conserver les éventuelles modifications Lovable concurrentes.
2. Résoudre uniquement le rebuild du preview Lovable, sans publier en production et sans modifier la DA.
3. Une fois preview réellement reconstruit : compte test authentifié → /app/payments → Mode test ; tester Checkout réel sandbox puis webhook et registre commandes.
4. Si auth/processeur externe bloque : documenter, passer aux tests publics/offline/responsive réalisables. Ne pas demander de validation pour des corrections réversibles.
5. Rejouer npm run check après changement, synchroniser commits et attendre CI ; verdict actuel NO-GO PRODUCTION.

Rapports spécialisés : docs/v1-security-continuation.md, docs/v1-video-offline-continuation.md, docs/v1-imports-i18n-continuation.md, docs/v1-responsive-qr-continuation.md, docs/stripe-runtime-bindings-20261005.md.
Aucune reprise automatique après quota n'a été démontrée.
