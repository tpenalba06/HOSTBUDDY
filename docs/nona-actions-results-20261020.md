# NONA — validation réelle GitHub Actions et bilan final

**Le blocage de validation navigateur local a été contourné par l'infrastructure GitHub Actions autorisée, sans retenter le navigateur local ni déployer NONA.**

Run final réussi : [39426948766](https://github.com/tpenalba06/HOSTBUDDY/actions/runs/39426948766), commit distant `c268f22bd03003b6e8d8b96aa0a94c2359cec2f3`, branche isolée `qa/nona-cloud-free-20261020`. Runner standard Ubuntu 22.04 dans le dépôt public existant, aucun abonnement ni service acheté. La branche de recette contient `git.deploymentEnabled=false` dans sa configuration Vercel ; aucune branche produit fusionnée, aucun déploiement commandé.

## Non-régression complète réellement exécutée

- Vitest : **595 tests passent, deux sont ignorés**, 95 fichiers passent et un fichier est ignoré.
- Tests natifs Node : **19 passent, un est ignoré**, zéro échec.
- Total : **614 tests passent et trois sont ignorés**. Les tests ignorés ne sont pas comptés comme réussis.
- TypeScript : passe.
- Lint global : **zéro erreur, 23 avertissements** existants de Fast Refresh.
- Compilation isolée du serveur et du vrai renderer partagé : passe.
- Playwright : parcours ordinateur **1440 × 1000** et mobile **390 × 844** passent, six messages par appareil.

La suite complète locale avait d'abord révélé deux simulations de l'ancien modèle local à adapter aux nouvelles exigences de question explicite et de non-envoi, ainsi qu'un test sans dépôt Git qui héritait du dépôt parent lorsque TEMP était dans le workspace. Ces trois tests ont été corrigés, sans affaiblir les règles métier. Le test natif HTTP interdit sur le poste passe sur le runner Linux.

Le lint global révélait aussi des erreurs de formatage préexistantes dans GuideView et guide-preview. Seul le formatage a changé : pas de nouvelle structure React, hook, contenu, classe CSS ou comportement visuel. Les contrôles de la skill React ont été appliqués à cette portée limitée ; les types et le lint ont été revérifiés.

## Parcours et captures automatiquement récupérées

Le navigateur réel ouvre la mascotte, le dialogue et la préparation du petit-déjeuner : quantité → heure → formule → récapitulatif à **75 €**, puis pose les questions de code de boîte à clés et d'allergènes. Il vérifie les réponses HTTP, l'absence d'appel IA dans ce laboratoire, l'absence d'erreur JavaScript et de débordement horizontal. Aucun bouton de confirmation de commande n'est actionné.

**Ces captures utilisent le repli guidé et des données synthétiques.** Elles prouvent le fonctionnement visuel du renderer partagé et de son API compilée ; elles ne sont pas une nouvelle conversation cloud dans le navigateur. Les vraies générations Ollama et leurs mesures sont documentées séparément dans `nona-six-languages-20261020.md`. Aucune clé Ollama ou Supabase privée n'a été envoyée au runner public.

Seize captures ont été récupérées automatiquement et examinées sur les états principaux. Sur mobile : fenêtre en plein écran, en-tête et champ de saisie visibles, texte lisible, formulaire et total à 75 € accessibles ; les longues réponses restent dans le défilement interne. Sur ordinateur : fenêtre à droite au-dessus du guide, récapitulatif et champ de saisie visibles. Le bouton de confirmation reste désactivé sans identité/conditions, ce qui évite une soumission accidentelle.

Limites : viewport mobile Chromium, pas de téléphone physique ni clavier logiciel iOS/Android. Pas de certification Safari ou de comparaison pixel par pixel avec une autre branche UX. L'aperçu conserve l'étiquette « IA locale » héritée de son transport de laboratoire, même si les réponses sont guidées ; ce libellé n'est pas une preuve d'inférence. Des avertissements de signature média proviennent de la source synthétique et ne valident pas le stockage Supabase public.

Deux premiers runs ont échoué avant le run vert : transfert UTF-8 du patch, puis sélecteur ambigu entre le champ du chat et celui du formulaire. Les captures du deuxième run ont été récupérées et analysées avant correction du test. Pas de faux succès sur ces essais.

## Coût et choix fournisseur

La dernière recette cloud a consommé **0,00451 $ affichés pour vingt générations**, couverts par Free, sans paiement. Cumul réel du chantier : **49 appels, 0,01021 $ affichés, 0 $ payé**. La médiane de la dernière série est de **0,843 seconde**. Six langues arrivent à un brouillon à 75 €, avec les replis et corrections décrits dans la preuve ; aucune réservation envoyée.

Projection mécanique à partir de cette série : vingt conversations par logement et par mois, six réponses IA par conversation, même coût moyen observé (cache inclus). Hors hébergement, taxes et change ; ni facture prévisionnelle garantie ni promesse que l'offre Free finance la production.

| Logements | Conversations/mois | Projection IA, USD/mois |
| --- | ---: | ---: |
| 10 | 200 | 0,27 $ |
| 100 | 2 000 | 2,71 $ |
| 500 | 10 000 | 13,53 $ |
| 1 000 | 20 000 | 27,06 $ |

Un contexte plus long, un cache différent et davantage de messages changent ces montants. Claude Haiku 5.5 reste candidat ; aucune mesure réelle Haiku à scénario identique n'est disponible et aucun financement supplémentaire n'est activé pour en fabriquer une.

## État final et limites d'autorisation

Codes d'accès et allergènes conservés. Backend existant, source de prix, moteur Services et commission inchangés. L'autorisation TEST est refermée et son refus d'une nouvelle réserve est vérifié. **49 tentatives et 49 observations**, réserve applicative conservatrice **0,98 € sur 4 €**, politique mensuelle de 20 € désactivée. La réserve n'est pas une dépense. Aucune recharge, aucun Lovable, aucun paiement ni changement de production.

**État : version de laboratoire réellement éprouvée en API cloud et en navigateur avec repli ; pas encore prête pour activation publique.** Restent notamment une recette cloud via l'interface hébergée de TEST, la comparaison réelle Haiku si un accès compatible avec les autorisations financières existe, la conversation longue et la vérification finale de confidentialité/isolation. Toute consommation continue et toute modification de production restent soumises à accord explicite.

Le dossier de captures et journaux est conservé dans `NONA-captures-et-tests-20261020.zip`. Les preuves structurées et le workflow exact sont dans `docs/evidence`. Le checkpoint local conserve les modifications sans écraser les autres travaux UX.
