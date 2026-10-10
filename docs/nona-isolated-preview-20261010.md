# Preview Nona TEST isolée — 10 octobre 2026

## Préparation réalisée

Le lanceur `scripts/validation/isolated-preview.mjs` fournit un serveur de recette de la branche effectivement commitée, sans modifier la configuration applicative partagée ni les projets hébergés.

- Référence Supabase verrouillée : `mhhtnqfdkyudwyqlmnce` ; toute autre référence est refusée par le constructeur d'environnement.
- Clés publiques/serveur TEST existantes lues dans deux fichiers privés, permissions restrictives et liens symboliques refusés. Aucun secret dans le Git, les arguments ou les résultats.
- Deux lectures de préflight sur cette cible : inscriptions désactivées et bucket `guide-media` privé accessible avec la clé serveur de cette cible.
- Checkout Git temporaire détaché du HEAD courant. Les changements suivis non commités et les fichiers `.env` suivis sont refusés. Les `.env` locaux non suivis ne sont pas copiés ; le plugin Lovable appelle lui-même `loadEnv` depuis le répertoire courant, ce qui rend ce checkout isolé nécessaire.
- Environnement du processus construit par liste blanche : seules les variables système nécessaires et les six réglages Supabase TEST sont conservés. Stripe, fournisseurs d'e-mail, secrets d'intégrations et transports d'alertes ne sont pas hérités.
- Même configuration Vite/TanStack et mêmes dépendances que l'application ; pas de route de substitution, de session injectée ou de contournement RLS.
- Écoute uniquement `127.0.0.1:8787`, port strict. Arrêt et suppression uniquement du checkout temporaire créé par cette exécution. La source, les fixtures et leurs fichiers privés sont préservés.

L'usage est destiné à l'opérateur technique ; aucune saisie de code ou de clé en chat n'est attendue du propriétaire.

```sh
node scripts/validation/isolated-preview.mjs --check
node scripts/validation/isolated-preview.mjs --probe
node scripts/validation/isolated-preview.mjs --serve
```

Le deuxième argument optionnel est le répertoire privé des fichiers `api-publishable` et `api-secret`. Par défaut, c'est le répertoire privé de recette adjacent au dépôt. Le script ne crée pas de clé et n'expose pas de bundle.

## Preuves

Trois tests de sécurité ciblés passent : exclusion des secrets et de la cible source du processus ; refus des clés lisibles par d'autres utilisateurs et des liens symboliques ; refus des inscriptions ouvertes, erreurs HTTP et bucket public.

La sonde réelle sur la cible restaurée a réussi : préflight Auth/Storage, rendu SSR `/demo?device=mobile` en HTTP 200, HEAD attendu dans l'HTML, client compilé raccordé à la cible TEST sans référence au projet source, clé serveur absente de l'HTML et du module client retournés. Le checkout temporaire a été retiré après le contrôle. Aucun RPC de mutation ni test financier exécuté. Les avertissements de compilation des modules financiers ne constituent pas un appel à Stripe.

Ces vérifications **ne prouvent pas** une session authentifiée dans un navigateur, un upload, une publication persistante ou une restauration supplémentaire. Les 147 contrôles de permissions et la reprise Supabase antérieurs restent acquis et n'ont pas été rejoués.

## Accès distant restant

Le navigateur cloud ne rejoint pas le loopback du runtime. Aucun transfert de port documenté n'est exposé. La preview Lovable reste raccordée à la source ; aucune fixture ni écriture de test n'y est autorisée.

L'accès Vercel a été examiné en lecture seule. Trois projets existants ont été listés ; aucun projet Nona. La lecture de l'équipe `tristanpenalba-8009s-projects` retourne **403 : périmètre non autorisé**. Le CLI Vercel n'est pas installé et aucun accès CLI propre n'a été trouvé. Aucun projet, environnement, secret ou déploiement Vercel n'a été créé ; le forfait et le coût éventuel n'ont pas pu être vérifiés.

**Intervention minimale pour cette voie : autoriser/reconnecter le connecteur Vercel au périmètre de l'équipe `tristanpenalba-8009s-projects`.** Aucun token ni mot de passe dans le chat. Après accès : vérifier forfait/quota, préparer un projet TEST dédié sans import de secrets existants, environnement preview uniquement, protection d'accès conservée, build de cette branche et vérification client/serveur sur la cible isolée. Ne pas déclencher de production et ne pas modifier les trois projets existants. Si aucun quota gratuit sûr n'est disponible, ne créer aucune ressource facturable.

Une reprise automatique du matin a été tentée, mais refusée par la limite de cinq tâches actives du forfait. Aucune tâche existante n'a été désactivée ou modifiée. Aucune exécution autonome nocturne ou reprise matinale n'est annoncée comme programmée.

## Suite

Après liaison au navigateur : sessions synthétiques existantes, publication et médias réels sur fixtures distinctes, tailles 360/390/768 px, téléchargements QR, puis mesures réseau mobile et essais Safari/Android. Aucun retest financier, audit de permissions global, onboarding, UX/DA, merge main ou déploiement production. Le lancement commercial reste **NO-GO** tant que les limites mobiles et les autres blocages établis ne sont pas clos.
