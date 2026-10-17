# Billing scheduler — validation preview, 5 octobre 2026

## Correction
`/api/billing-sync` lisait encore process.env, contrairement aux secrets Cloudflare liés à chaque requête. Le handler utilise désormais paymentServerEnvironment(request), autorise BILLING_SYNC_SECRET et authentifie avant de charger le client admin. Réponses non cachées ; erreurs génériques ; file non terminée en 503 avec Retry-After.

## Vérifications exécutées
- 8 assertions Vitest du handler : binding worker, absence de fallback Node si bindings présents, absence/mauvais bearer, encodage Unicode, succès, file en attente, erreur sans secrets.
- 7 tests Node du runner : preview uniquement, URL/path stricts, refus des redirects, erreurs 4xx non réessayées, retries réseau/5xx bornés.
- scripts/validation/billing-sync-queue.sql réellement exécuté sur base preview dans BEGIN/ROLLBACK : deux logements fictifs ; changement de révision pendant lease ; mauvais lease rejeté ; échec/reprise ; archivage/restauration fictifs ; récupération lease expiré ; RPC inaccessible anon/authenticated. Résultat fixtures_rolled_back, queue_revision_tests_passed et retry_and_lease_tests_passed tous true.
- npm run check : 193 tests, 37 fichiers ; lint sans erreur (16 avertissements préexistants), TypeScript et build production OK.

## Préparé mais NON activé
Workflow GitHub `.github/workflows/billing-sync-preview.yml`, toutes les dix minutes, uniquement si HOSTBUDDY_BILLING_SYNC_TEST_ENABLED=true. Runner HTTPS preview Lovable, bearer sans redirection, quatre essais maximum.
Variables GitHub nécessaires : HOSTBUDDY_BILLING_SYNC_URL et HOSTBUDDY_BILLING_SYNC_TEST_ENABLED ; secret GitHub BILLING_SYNC_SECRET correspondant au binding serveur. Ne jamais enregistrer la valeur dans ce document.

Cloud Jobs montre « No scheduled jobs yet ». Accès UI GitHub secrets non connecté ; outil GitHub n'a pas de droit secrets. Aucun ordonnanceur n'a été activé. Un workflow schedule doit être présent sur la branche par défaut avant exécution automatique (documentation officielle https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## Prochaine action
Configurer le secret/variables via administrateur autorisé dans l'environnement test, rendre le workflow disponible pour workflow_dispatch, déclencher et vérifier réponse 200 plus jobs complétés. Vérifier webhook Stripe sandbox séparément. SQL et mocks ne prouvent PAS un appel Stripe ni un ordonnanceur opérationnel.

## Rollback
Revenir au commit précédent pour annuler le handler/runner. Désactiver HOSTBUDDY_BILLING_SYNC_TEST_ENABLED avant retrait du workflow. Aucune migration ni mutation persistante réelle dans ce lot.
