# HostBuddy — reprise V1, 5 octobre 2026

## État et règles
DA préservée ; source actuelle GuideView/ManagerShell. Stripe sandbox uniquement, aucune production finale, aucun paiement réel, aucune suppression réelle. Consolidation distante : d9547599722c8d7b1e0b8d904fb9a33cf049619d. Correction Lovable ensuite : 3e3103bfe0338d66258032af78cb120312087c82. Le commit contenant ce fichier est le checkpoint de reprise ; utiliser git log -1 pour son SHA local puis vérifier GitHub avant toute synchronisation.

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
- Cause preview trouvée : types Supabase régénérés par Lovable, complete_billing_sync._error typé non-null malgré SQL nullable. Correction Lovable 3e3103b appliquée ; build et pages validés par Lovable. Types/correction récupérés localement. Lint conserve contrôles sémantiques et TypeScript mais ne reformate pas la source générée. Téléphone homepage corrigé : liens du guide séparés du lien global pour éviter les ancres imbriquées ; revalidation navigateur après synchronisation encore à faire.
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

## Checkpoint de reprise — lot réseau et scheduler
- Distant Lovable 2a2968d3a318946f174bc5f989934314b21b8022 ; miroir local c85a1d2. QR import dynamique corrige node:fs en SSR workerd ; photo unique Services pleine largeur. DA conservée.
- Revalidation preview externe : bundle index-BJIpuip3.js observé, aucune nouvelle erreur SSR, zéro ancre imbriquée et zéro overflow horizontal desktop. Les anciennes erreurs console du bundle DVLS_V8_ sont historiques.
- Vrai offline navigateur automatisé Lovable : production workerd, 390×844, guide fictif fermé, réseau coupé (same-origin et externe échouent), réouverture : texte, 5/5 images, Wi-Fi/Arrivée/navigation fonctionnent. Vidéo non testée : fixture sans vidéo.
- 42 captures / 7 largeurs × 6 écrans publics/démo, pas de débordement. Ne couvre PAS les écrans gestionnaires réels authentifiés ni scan smartphone physique.
- HTTP JWT A réel : lectures cross-org vides et accès refusés. Deuxième JWT B/auth/signup/reset/invitations pas encore validés. Aucun changement effectif de données réelles.
- Scheduler : handler corrigé bindings Cloudflare ; 15 nouvelles assertions ; vrai test SQL queue en transaction annulée passé. Workflow préparé mais NON activé : accès GitHub secrets nécessaire.
- Validation complète locale : npm run check, 193 tests / 37 fichiers, TypeScript/build OK, lint 0 erreur/16 avertissements.
- Tâche native Lovable Stripe sandbox démarrée umsg_01m45qvapqe8194bf4yazzq9bz : uniquement nouvelle organisation fictive owner self, aucun logement réel muté, retour Checkout et preuves webhook si possibles ; sinon imports réseau/QR.
- Prochaine action exacte : récupérer get_message de cette tâche, conserver les commits Lovable concurrents, vérifier parcours Stripe réel puis documenter. Scheduler : configurer secrets test via accès humain autorisé avant workflow_dispatch. Transcodage serveur, vidéo offline, seconde session B et scan physique restent non prouvés. Verdict NO-GO PRODUCTION.

### Suite du checkpoint
- Scheduler synchronisé distant 93572fa224d3d21a3e86206512de41fa05d91783 : CI push et PR success (runs 37293570388 / 37293577736). Workflow toujours non activé.
- Rapport Stripe initial ec46b2ff : mode test/Billing/Connect détectés par vraie fonction serveur ; fixture dédiée deux brouillons ; vrai Checkout 999 cents ouvert, pas encore payé. Ne pas confondre session créée et paiement réussi. Suite native umsg_01m45r1f5ee9hap0ky8c1wtzkz en cours avec troisième logement fictif autorisé.
- PMS Guesty corrigé pour bindings Cloudflare et statut clé 32 octets ; aucun provider réseau annoncé opérationnel. npm run check : 197 tests/38 fichiers, TypeScript/build réussis.
- Preview externe /demo reconstruit avec index-BJIpuip3.js ; aucune nouvelle erreur SSR. Capture hostbuddy-v1-preview-20261005.jpg.
- QR démo affiché à la bonne URL absolue /demo ; clic PNG envoyé, événement téléchargement navigateur cloud a expiré sans chemin retourné. Ne pas prétendre fichier reçu ni scan physique effectué.
