# Recette import long — 17 novembre 2026

## Livraison

Code déployé : `dedf6eabcae78b19790e8c925a70e44375dcbdad`, après `6a603c1440bbf9547f72dca6f3d49dd14fd4e7e7`.
Branche de sauvegarde : `work/nona-commercial-beta` sur GitHub.
Preview : https://nona-concierge-test-20261020-p46sffqfy.vercel.app/
Déploiement : `dpl_ALjwQLn3XfuAogvMa6EzvTzYAgtS`, READY, staging.
Projet : `nona-concierge-test-20261020`, live=false, SSO active `all_except_custom_domains`.

## Corrections et preuves

- Suppression de la troncature publique des rubriques texte à 2 400 caractères ; conservation des faits sûrs déjà extraits dans la limite existante de 200 000 caractères du document.
- Description URL admissible conservée sans l'ancienne troncature à 800 caractères. Cela ne rend pas une source bloquée importable.
- Sélection Smart Fill utilisant la description explicite lorsque le titre ne détermine pas le type de logement. Test unitaire : « Résidence Rhéa » décrite comme chalet choisit un visuel chalet.
- Scénario navigateur depuis la homepage : 35 recommandations totalisant 4 470 caractères, secret fictif multiligne au milieu, séparateurs CRLF. Les 35 valeurs sont présentes dans la rubrique Bonnes adresses et le secret est absent du téléphone.
- Navigateur local : scénarios réalisés en 390 et 1440 px. Captures et résultats dans le dossier voisin `nona-commercial-browser-tools`, fichiers `long-guide-390.png`, `long-guide-1440.png`, `long-guide-results.json`.
- Preview distante : import réalisé par le formulaire réel, ouverture de Bonnes adresses dans le téléphone, 35 recommandations retrouvées dans le contenu rendu, secret absent. La capture montre le téléphone et le formulaire dans leur contexte. Ce contrôle distant ne constitue pas une recette multilingue exhaustive.
- Non-régression `npm run check` terminée avec code 0 : 706 tests Vitest réussis, 2 ignorés ; 23 tests Node réussis, 1 ignoré ; TypeScript, lint, build et contrôle homepage compilée réussis. Journal local voisin `nona-rich-import-final-check.log`.

## Limites et reprise

Le test de 35 recommandations vérifie précisément la perte par troncature, pas toutes les catégories d'un document désordonné. Les services et l'interface n'ont pas été modifiés. Aucun nouveau connecteur partenaire, accord média ou licence d'image n'a été créé. Voir la matrice des plateformes pour les autorisations officielles à obtenir.

Les contrôles authentifiés d'isolation API entre gestionnaires et les cinq scénarios HTTP de séjour privé restent à terminer. Ils ne sont pas validés par cette mission. La bêta reste fermée.

Le changement préexistant non publié de `scripts/validation/beta-security.ps1` a été conservé sans être inclus dans ces commits. Aucun Lovable, paiement, production ou abonnement activé.
