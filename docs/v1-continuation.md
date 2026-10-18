# HostBuddy — reprise V1, 5 octobre 2026

## Reprise 18h31 Paris — UX vidéo de présentation / sections

Cette passe exécute le brief `Markdown collé(6).md` directement dans le dépôt, sans crédits Lovable ni production. Détails : `docs/ux-editor-presentation-sections-20261005.md`.

- Implémenté : bloc vidéo principal facultatif haut dans Général ; remplacement sûr ; retrait explicite sans fallback ancien ; vidéo unique après Cover et avant Services ; ratio intrinsèque / hauteur limitée ; organisateur vertical dnd-kit (poignée, Pointer/touch, clavier, menu alternatif) ; ordre public/preview fidèle au `sort_order` ; rollback visuel et compensation API ; six langues.
- Validation locale : `npm run check` réussi, 228 tests / 41 fichiers, lint 0 erreur / 16 warnings préexistants, TS et build OK. Aucun changement schéma. Tests upload/sélection échoués, suppression, ordre, preview, remount et rollback couvrent les nouvelles branches.
- Tests navigateur préparés : `scripts/e2e/editor-ux.mjs`, workflow étendu, 360/390/430/768/1440, souris/touch/clavier/fallback, reload démo, vidéos synthétiques paysage/portrait et captures. Contrôle syntaxique seulement : PAS de validation navigateur réelle nouvelle. Chromium local SIGSEGV, daemon agent-browser échoué au démarrage.
- Ref distante relue : `09cc59a5c81bfb0ce5210749fe63565b614e66cd`. Tree comparé : les écarts locaux préexistants sont scroll, lien légal et documentation. Aucun changement concurrent sur les fichiers de cette mission détecté. Ne jamais pousser le HEAD local directement au-dessus de l’historique distant.
- Synchronisation toujours bloquée par le précédent refus automatique de publier du code dans un dépôt public sans autorisation explicite de push. Travail local commité ; obtenir cette autorisation avant écriture GitHub, sans contourner le refus. Aucune nouvelle consommation Lovable.

### Prochaine action exacte

1. Après autorisation de push : relire la ref GitHub, créer un commit au-dessus du dernier parent distant avec les seuls fichiers revus, inclure les précédents correctifs scroll, sans force push ni réécriture. `git log -1` donne le checkpoint UX local.
2. Lire le résultat des workflows Validate et Demo scroll browser checks. Récupérer `/tmp/hb-editor-evidence.json`, captures hb-editor/hb-intro, preuves wheel/touch. Si une assertion échoue, corriger et rejouer.
3. Vérifier save/reload/publication sur logement fictif authentifié ; vraie vidéo Storage et preview/public identiques. Les tests jsdom et blobs démo ne prouvent pas ce parcours réseau.
4. Reprendre ensuite les autres blocs V1 déjà documentés, sans rejouer les validations acquises et sans modifier la DA. Verdict production reste NO-GO.

## Reprise 17h29 Paris — correctif local prêt, synchronisation bloquée

- Ref distant vérifié : `09cc59a5c81bfb0ce5210749fe63565b614e66cd`. CI Validate push/PR réussies (`37326180282`, `37326189193`). Workflow scroll `37326180291` échoué, logs du job `111817396215` récupérés.
- Preuve navigateur acquise dans ces logs : scroll interne voyageur ET gestionnaire, homepage et /demo, à 360 px ; passage au document haut/bas homepage à 360 px. À 390 px, voyageur passe et gestionnaire défile intérieurement ; passage au document en bas gestionnaire échoue. Largeurs suivantes et gestes tactiles non atteints : ne pas annoncer leur validation.
- Correctif local : `overflow-clip` remplace `overflow-hidden` sur le cadre et les parents non défilants de la démo gestionnaire. La découpe visuelle reste identique, ces parents ne créent plus de conteneurs de défilement intermédiaires. Hypothèse à confirmer par le prochain run navigateur, aucune preuve de réussite après correctif.
- Script E2E étendu à 820/1024 px (sept largeurs au total), gestes tactiles voyageur ET gestionnaire à 390 px, captures distinctes homepage/demo. Contrôle syntaxique Node et diff-check passent.
- `npm run check` après correctif applicatif : 216 tests / 40 fichiers, lint zéro erreur / 16 warnings existants, TypeScript et build réussis. Chromium local plante SIGSEGV avant tout chargement ; agent-browser daemon échoue. Aucun parcours local navigateur annoncé comme réussi.
- Synchronisation GitHub refusée deux fois par l'approbation automatique : première raison dépôt non vérifié ; propriétaire et permissions admin/push ensuite confirmés (`tpenalba06`, repo 1400305838) ; seconde raison publication de code dans un dépôt public sans autorisation user-authored reconnue. Aucun ref déplacé ni fichier distant modifié. Ne pas contourner ; obtenir autorisation explicite de pousser les corrections sur cette branche publique.
- Navigateur cloud neuf, uniquement about:blank, aucune session Stripe/gestionnaire ni inbox test. Connect, scheduler et auth réseau restent bloqués par leurs accès ; aucun crédit Lovable consommé, aucun paiement Live, aucune production.

### Reprise exacte

1. Après autorisation de push : relire le ref et les fichiers GitHub, préserver tout changement concurrent ; synchroniser uniquement les diffs revus, sans force push. Le dépôt local n'a pas encore les objets des trois derniers commits distants : ne pas publier son HEAD tel quel.
2. Récupérer le résultat du nouveau workflow `Demo scroll browser checks`, job/logs/artefact ; vérifier les 28 couples route/mode/largeur et les deux gestes tactiles. Si échec, corriger puis rejouer, pas de GO sur CSS seul.
3. Conserver les acquis Billing/webhook/offline/paywall. Reprendre Connect sur compte TEST opérationnel, scheduler avec accès secrets autorisé, puis auth A/B/inbox, import photos, QR et contrôles finaux. DA inchangée. Verdict actuel NO-GO.

## Passe P0 scroll/paywall — état autoritaire du 5 octobre après le nouveau brief

Cette section remplace les priorités anciennes : transcodage serveur, upload reprenable, traduction automatique et PMS sont POST-V1 et ne bloquent plus la sortie. DA et renderer conservés, aucun crédit Lovable consommé. Rapport détaillé : `docs/v1-scroll-paywall-20261005.md`.

- Dernier lot applicatif distant : `8c980f663492940671ef8c86a065845b8d5b9b1f` ; derniers diagnostics E2E : `c4ccc044558663f0ff0ea9f4f24b817a9d34af96`. Le commit documentaire suivant sera le checkpoint exact : consulter le ref GitHub actuel avant reprise, aucun force push.
- 216 tests / 40 fichiers, TypeScript, lint zéro erreur (16 warnings existants) et build passent localement. Revue React appliquée, aucune nouvelle dépendance navigateur dans le bundle applicatif.
- Paywall DB `0018_publication_billing_gate.sql` APPLIQUÉ sur preview après préflight transactionnel. Assertions SQL rejouées : `paywall_assertions_passed=true`, `fixtures_rolled_back=true`. Deux logements non archivés ou plus exigent abonnement valide et queue synchronisée avant publication ; direct INSERT/UPDATE publié et restore contournement refusés. Grâce `past_due` 3 jours, annulation/expiration : un seul guide public gratuit conservé, aucun snapshot supprimé. Rollback prévu, non exécuté.
- Scroll CSS : overscroll-y auto, grille embedded toujours contrainte à hauteur100% et rangée minmax(0,1fr), mobile une colonne. Le code est livré, mais ne pas annoncer les gestes validés sans le résultat du workflow `Demo scroll browser checks`. Deux premiers runs ont échoué à la mesure du scroll/styles ; diagnostic renforcé et attente des styles du démarrage Vite ajoutée. Dernière exécution à récupérer avant toute nouvelle modification.
- Connect : version preview ajoutée aux deux reads Accounts v2 (overview/Checkout), tests mocks passent. Onboarding juridique et identité toujours non soumis ; `charges_enabled=false`, 2%/paiement service/refund toujours NON prouvés réseau. Billing/webhook/vidéo offline acquis : ne pas refaire.
- Scheduler : `/api/public/billing-sync` signée + runner host stable dev ; tests passent. GitHub secrets/vars/dispatch non accessibles avec les outils disponibles : non activé. URL à configurer : stable preview + `/api/public/billing-sync`, secret serveur/GitHub identique, flag TEST. Production requiert scheduler avec domaine explicitement autorisé et secret distinct.
- Marketing Free et palier 2 logements corrigés six langues ; `/legal` préparé avec contenus manquants honnêtement signalés, footer/auth liés. Legal non finalisé avant informations société/conditions.
- Blocages accès : navigateur local Chromium crash139, agent-browser daemon indisponible, cloud refuse localhost `ERR_BLOCKED_BY_CLIENT` ; GitHub Actions fournit le navigateur public/démo. Aucun JWT A/B, aucune inbox test, aucun secret Stripe/GitHub administrable dans cette session. Ne pas réclamer un parcours réseau que ces accès ne permettent pas.

### Prochaines actions exactes

1. Lire le dernier workflow `Demo scroll browser checks` du ref actuel avec GitHub actions/runs, ses jobs/logs/artifact. Corriger toute assertion réelle qui échoue, puis rejouer. Le script est `scripts/e2e/demo-scroll.mjs` : homepage et /demo, 360/390/430/768/1440, deux modes, wheel chaining et touch.
2. Valider Connect sur un compte TEST prêt via parcours permis, sans accords réels ni identité réelle. Si dépendance humaine confirmée, documenter et passer immédiatement.
3. Configurer scheduler avec accès autorisé aux secrets, tester 200 + queue/retry ; finir auth A/B réel/inbox, photo import autorisé, QR téléchargement/scan, responsive gestionnaire authentifié, Lighthouse/réseau lent et sauvegarde.
4. Compléter documents `/legal` ; aucun GO ni production finale sans ces validations. Verdict de cette passe NO-GO PRODUCTION.

## Dernier état autoritaire — reprise après tâche réseau

Cette section remplace les statuts anciens ci-dessous pour webhook, Connect et vidéo offline. Les checkpoints historiques restent conservés comme traces.

- Résultat récupéré de `umsg_01m45rzpnre3sbk60d7vcq5vfm` : terminé ; commit `8ba5eb845e1a58251d34d78a1cb4806bb4282f7b`, présent sur `feat/guest-guide-v2-lot1`. Rapport pass 2 + pass 3 conservé dans `docs/v1-stripe-network-validation-20261005.md`.
- Deux CI du commit vérifiées réussies : `37297663946` et `37297658402`. Rapport de tâche : 207 tests, types et lint réussis ; CI exécute aussi le build.
- Webhook TEST externe validé : seuls les deux endpoints existants ont changé d'URL vers le host `project--ad0b09fe-b134-491b-8601-9d64d6d27b86-dev.lovable.app/api/public/stripe-webhook`. Mauvaise signature refusée 400 ; événement réel `evt_1UN8wyPirDxaYw93oT7KhMJV` livré par Stripe et enregistré à `2026-10-05T10:16:54Z`. Ne pas refaire ce test acquis. L'autre host preview protégé reste inaccessible à Stripe.
- Connect FR : création de compte TEST et lien d'onboarding réels validés. Le correctif ajoute `use_case.account_onboarding.configurations: ["merchant"]`. Onboarding non terminé, `charges_enabled=false` ; paiement voyageur, commission 2 % et remboursement toujours NON validés. Ne jamais accepter un accord réel ni envoyer une identité réelle pour ce test.
- Vidéo offline : upload réel d'une vidéo synthétique H.264/AAC 4 s via le pipeline navigateur ; lecture et seeking validés sur build production local workerd à 390×844, après fermeture, réseau coupé ET serveur arrêté. Ce n'est pas une validation sur hébergement distant ou téléphone physique. Transcodage serveur et upload reprenable restent absents.
- Import Wikipedia corrigé et rejoué : 0 champ, informations insuffisantes. Import photos réseau toujours à vérifier.
- Aucun nouveau message envoyé à Lovable pendant cette reprise ; ne pas consommer de crédits pour relancer les validations acquises. DA et production inchangées.

### Suite à exécuter

1. Préserver les commits concurrents et ce résultat avant modification.
2. Connect : obtenir un compte sandbox réellement opérationnel par un parcours de test permis ; tester alors paiement service, frais 2 %, webhook commande et remboursement. Si le parcours impose une acceptation juridique réelle, laisser ce point explicitement bloqué.
3. Vidéo : provisionner et intégrer un processeur serveur de test, avec isolation tenant/file de tâches/limites/annulation, puis upload interrompu/reprise et lecture sur hébergement réel. Ne pas présenter FFmpeg/WASM navigateur comme conversion serveur.
4. Sécurité/auth : seconde session HTTP B, signup/reset et préparation/acceptation d'accès ; scheduler preview à activer uniquement avec accès autorisé aux secrets. Imports photos et contrôles gestionnaire restent ouverts.
5. Scan QR et offline Android/iOS nécessitent un appareil physique. Verdict reste NO-GO production tant que les blocages applicables ne sont pas levés.

Accès de cette reprise : le navigateur cloud a refusé l'URL du preview avec `net::ERR_BLOCKED_BY_CLIENT`. Aucune session gestionnaire existante dans ce navigateur. Aucun secret Stripe ni accès processeur vidéo n'est exposé au workspace ; ne pas prétendre les parcours réseau restants exécutés ici.

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

### Paiement sandbox réel et correction des blocages

- Lot Lovable 0fa6844eebac29f37746e2cf9f72f1e2baff43b6 : Checkout réel 4242 payé, subscription active 999+299 ; archive/restauration uniquement fixture C donne 999 puis 1298. Webhooks Stripe échouent 401 preview. Replay de vrais événements vers localhost 200, distinct d'une livraison réelle.
- Connect échoue faute de country et version preview ; correction root : pays légal explicite sans défaut, Accounts/AccountLinks preview par requête, Billing inchangé. Webhook signé déplacé vers /api/public/stripe-webhook avec ancienne route compatible.
- Validation complète correction : 203 tests/39 fichiers, TS/lint/build réussis. Prochaine action : après synchronisation, changer URLs endpoints Stripe TEST uniquement et observer vrais événements livrés ; tester Connect pays fictif FR et arrêter uniquement sur vraie dépendance OTP/accord. Ne pas considérer 2%/refunds validés avant paiement service réel sandbox.
- CI PMS distant réussie : runs 37294255141 et 37294260558.
