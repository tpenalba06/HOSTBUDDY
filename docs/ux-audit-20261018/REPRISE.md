# NONA — checkpoint UX du 18 octobre 2026

## État et limites

Premier lot local implémenté et contrôlé techniquement. **Le chantier UX n'est pas validé en navigateur.** Le navigateur intégré ne fournit aucune surface, son ouverture échoue, le runtime Windows renvoie `failed to launch codex app-server: program not found`, et Chromium Playwright ne démarre pas (`spawn UNKNOWN`). Une tentative de lancement direct a été rejetée par l'approbation automatique ; aucun contournement n'a été entrepris. Voir `before/audit-blocked.md`.

Les missions de découverte à froid, captures, traces, tests à 360/390/430 px et comparaison de clics restent à effectuer. Aucun chiffre de réussite utilisateur, gain de temps ou absence de débordement n'est revendiqué. L'agent indépendant n'a lu le code qu'après l'échec documenté de sa mission à froid, pour une revue technique distincte.

## Source préservée

- Répertoire actif : `output/nona-lovable-sync` ; base locale `c62ef35d3c069f78504f27b07644bd60c161008a`.
- Arbre propre avant intervention. Travail réalisé sur une branche UX locale, sans restauration d'anciennes versions, sans modification du dépôt de référence extérieur au workspace.
- Les originaux NONA, couleurs et typographies de la DA existante restent inchangés.
- Aucun outil Lovable, aucun crédit, aucun appel IA payant et aucun déploiement. Aucun push vers une branche connectée à Lovable.
- Aucun changement de schéma, fournisseur IA, import, connecteur, permissions serveur, réservation, moteur Services ou calcul Stripe/commission.

## Modifications et intention

| Surface | Modification | Effet recherché, à confirmer en navigation |
|---|---|---|
| Accueil | Démo mise en avant et indication sans compte ; la deuxième application complète embarquée devient une entrée vers les deux vues du même produit | Moins d'interfaces concurrentes et de chargement inutile |
| Démo | Cadre de page immersif, défilement du document, onglets explicites, navigation clavier, mode dans l'URL, appel à créer son livret | Bascule prévisible voyageur/gestionnaire et navigation retour du navigateur |
| Démo | Gestionnaire chargé au premier usage et conservé après visite ; même fixture Villa Mare, GuideView et ManagerShell | Préserver édition et fidélité produit sans charger l'éditeur d'emblée |
| Gestionnaire | Ajouter prioritaire ; groupes logements/activité/organisation ; ajout direct en navigation mobile, retours accessibles dans Plus | Hiérarchie plus claire, destinations conservées selon le rôle |
| Logements | Actions Modifier le livret / Voir le guide, filtres réinitialisables, état vide actionnable, choix d'import traduits | Réduire les impasses et préciser les actions |
| Guide | Raccourcis arrivée/Wi-Fi/adresses avant les photos ; Retour visible ; conservation filtre, scroll et focus | Accès aux essentiels et retour au bon endroit |
| Concierge | Invitation explicite persistante, bouton de découverte de ses possibilités, chargement annoncé, copie avec retour exact | Découvrir le chat et obtenir un retour immédiat sans altérer son transport |
| Commun | États tactiles/focus, transitions discrètes, skeleton de chargement éditeur, indicateur de navigation, liens d'évitement | Réactivité et accessibilité cohérentes, reduced-motion respecté |

La démo embarquée et les aperçus autonomes conservent leurs liens existants (`preview=guide`, `preview=manager`, `device=mobile`). Les nouveaux liens de découverte utilisent `/demo?mode=guest` et `/demo?mode=manager`.

## Revue indépendante du diff

Trois risques identifiés puis corrigés et relus :

1. Choix du conteneur de scroll du guide : propriétaires explicites, sinon débordement réel ; exclusion body/html.
2. Changement d'écran gestionnaire : retour au début et focus du titre seulement sur changement de destination, jamais au montage initial.
3. Passage de l'éditeur à l'aperçu : focus de l'onglet voyageur après rendu.

Cette revue est statique et ne remplace pas un essai réel de focus ou de défilement.

## Vérifications exécutées

- Vitest : **480 réussis, 2 ignorés**, 90 fichiers dont 1 ignoré. Les 478 tests précédents restent présents et réussis ; deux tests de copie ajoutés (succès après résolution effective du presse-papiers, refus expliqué sans faux succès).
- Node : **19 réussis, 1 ignoré**. Un premier passage a rencontré EPERM dans le répertoire temporaire Windows ; nouvelle exécution dans le répertoire temporaire autorisé réussie sans modification de code métier.
- TypeScript, ESLint, compilation Vite : réussis.
- Inventaire des migrations : 26, aucune nouvelle migration.
- Contrôle de la compilation : SSR accueil HTTP 200, priorité image conservée, trois fontes WOFF2 locales, pas de doublon TTF.
- Prévisualisation de développement : `/` et `/demo` répondent HTTP 200. Cela ne valide ni l'hydratation ni l'utilisation au navigateur.
- `git diff --check` : réussi.

## Prévisualisation locale

- Accueil : http://127.0.0.1:4184/
- Démo voyageurs : http://127.0.0.1:4184/demo?mode=guest
- Démo gestionnaire : http://127.0.0.1:4184/demo?mode=manager
- Téléphone : http://127.0.0.1:4184/phone-preview?lang=fr

Le serveur doit rester actif sur le PC ; une URL 127.0.0.1 n'est pas un hébergement permanent. Cette session de prévisualisation utilise une configuration backend fictive pour isoler les essais des données clients. Les vues gestionnaires à essayer sont celles de la démo, sans connexion client.

## Reprise suivante

1. Lire ce fichier et `git status`, préserver tout travail ultérieur.
2. Ne pas appeler Lovable et ne pas pousser la branche connectée sans nouvelle autorisation.
3. Réaliser les trois missions décrites dans `before/audit-blocked.md` dès qu'un navigateur est autorisé/exposé, en donnant des objectifs et aucune route ou sélecteur produit à l'agent.
4. Pour la référence avant, utiliser une copie isolée du commit `c62ef35`, sans réinitialiser le dépôt courant. Conserver captures et traces réelles des deux versions.
5. Mesurer actions, retours, impasses et réussite séparément par mission/profil, en indiquant qu'il s'agit de simulations agents.
6. Corriger uniquement les frictions effectivement découvertes, vérifier mobile 360/390/430 et desktop, accessibilité/clavier/reduced-motion, puis rejouer les contrôles pertinents.

Le rapport et le script d'audit ne sont pas des preuves de parcours exécutés. Ne pas annoncer ce lot comme « UX finale » avant ces vérifications.
