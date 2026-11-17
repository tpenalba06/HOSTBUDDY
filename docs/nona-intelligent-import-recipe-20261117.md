# Import intelligent — recette et limites du 17 novembre 2026

## Version livrée

Code : `b48bbee`, après `f8d7ce6`, sur `work/nona-commercial-beta`.

Preview : https://nona-concierge-test-20261020-6op0kpsj3.vercel.app/

Déploiement : `dpl_8zM7j2wGfreWULKba9rK6YdTGXTa`, READY, staging. Projet `nona-concierge-test-20261020`, live=false, protection SSO `all_except_custom_domains`. Le reconstructeur vérifie chaque fichier du manifeste source et exige VERCEL_ENV preview et le projet Supabase TEST `mhhtnqfdkyudwyqlmnce`. Aucun changement de production.

## Corrections

- Reconnaissance des musées, promenades, transports, contacts allemands et italiens, accès et départ portugais. Nouveau champ Transports facultatif, classé avec l'arrivée dans le livret gestionnaire et consultable séparément dans le téléphone.
- Les consignes d'accès sûres sont transmises à la rubrique d'arrivée. Auparavant, des informations extraites n'y étaient pas rendues.
- Segmentation de paragraphes même lorsque la phrase suivante commence par une minuscule, en préservant des abréviations courantes et les citations source.
- Protection des codes d'accès dont la valeur est sur la ligne suivante dans les six langues, y compris italien et allemand. Les secrets restent dans l'extraction destinée au contexte privé, pas dans la projection publique.
- Le calcul secondaire de l'horaire dans l'aperçu respecte désormais les conflits détectés par le moteur. La capture initiale révélait une sélection incorrecte de 18 h alors que 16 h était aussi présent ; la capture finale ne choisit aucun des deux horaires.
- Disponibilité Wi-Fi italienne reconnue sans transférer le mot de passe.
- Libellés de champs traduits désormais associés à des clés stables : l'ajout d'un champ ne décale plus les autres traductions.

## Corpus et mesure

Six références synthétiques rédigées pour la recette, FR/EN/ES/DE/IT/PT, avec 25 faits annotés par langue. Chaque référence produit des documents de 500, 2 000 et 5 000 mots exactement, en répartissant les faits dans tout le texte et en changeant leur ordre. Les documents longs utilisent une trame narrative répétée : ils vérifient la longueur, les positions tardives et le mélange des rubriques, mais ne représentent pas 18 documents clients indépendants ni tous les styles réels.

| Langue | Avant, faits retrouvés au bon endroit | Après | Vérifications après sur les trois longueurs |
|---|---:|---:|---:|
| Français | 23/25 | 25/25 | 75/75 |
| Anglais | 22/25 | 25/25 | 75/75 |
| Espagnol | 21/25 | 25/25 | 75/75 |
| Allemand | 18/25 | 25/25 | 75/75 |
| Italien | 18/25 | 25/25 | 75/75 |
| Portugais | 18/25 | 25/25 | 75/75 |

Le rappel des faits annotés passe de 360/450 (80 %) à 450/450 (100 %). Les 450 contrôles portent sur 150 faits distincts réutilisés à trois tailles. Aucune omission ou mauvaise affectation parmi les faits annotés après correction ; aucune citation inventée détectée. La mesure exige que le fait soit présent dans sa rubrique attendue et que ses citations existent dans la source. Elle ne mesure pas la précision de chaque affectation supplémentaire possible de la prose narrative. Ne pas en faire une promesse de 95 % sur n'importe quel document.

Les heures contradictoires sont conservées en revue privée et retirées de l'aperçu public ; les secrets fictifs sont retrouvés en extraction et masqués dans le téléphone. La présence publique du Wi-Fi disponible est vérifiée séparément de ses identifiants.

Résultats annotés : `docs/validation/nona-import-reference-scores-20261117.json`.

## Navigateur réel depuis la homepage

- 36 parcours locaux : six langues × trois longueurs × mobile 390 px et desktop 1440 px. Pour chacun, 19 faits publics attendus réellement consultés dans les rubriques du téléphone, via sa navigation/recherche et l'ouverture des consignes repliées. Les trois secrets et les deux horaires contradictoires ne comptent pas comme contenus à publier. Le Wi-Fi est contrôlé à part. Retour à Villa Mare après chaque document, sans rechargement.
- 12 parcours complémentaires sur le code final, six langues × 5 000 mots × deux largeurs : mêmes rubriques, assertion explicite de refus des horaires contradictoires, disponibilité Wi-Fi visible, secrets absents, réinitialisation. Résultats `nona-import-reference-browser-wifi-20261117.json`.
- Les temps locaux entre clic Générer et apparition du nom vont de 46 à 172 ms dans ces relevés. Ce n'est ni une latence fournisseur ni une garantie de performance sur un appareil client.
- À distance sur la Preview finale : import réel par formulaire, clés visibles, aucun horaire contradictoire choisi, transports consultables, musée et 35 recommandations retrouvés, disponibilité Wi-Fi italienne visible, secret et code multiligne absents. Ce scénario distant complète les 36 parcours locaux ; les 36 parcours n'ont pas été répétés sur Vercel.
- Aucun compte créé, aucune donnée de recette enregistrée chez Supabase, aucun appel d'IA distante ni paiement. Les requêtes externes du navigateur local sont bloquées. La démo de services existante et Smart Fill sont conservés ; aucun nouveau service commercial publié.

Captures locales dans le dossier voisin `nona-commercial-browser-tools` : `reference-arrival-390.png`, `reference-transport-390.png`, `reference-places-390.png` et leurs équivalents `1440`. Les images Smart Fill portent leur mention illustrative ; aucune nouvelle image ou licence créée dans ce chantier.

## Non-régression et reprise

`npm run check` terminé avec code 0 : intégrité des 29 migrations, lint, 731 tests Vitest réussis (2 ignorés), 23 tests Node réussis (1 ignoré), TypeScript, compilation et contrôle de la homepage compilée. Journal local voisin `nona-import-intelligent-final-check.log`.

Recette reproductible : `src/lib/import-engine/reference-corpus.test.ts` pour les métriques, `scripts/validation/import-reference-browser.mjs` pour la navigation. Le second utilise Playwright installé dans l'environnement de recette, ou le module indiqué par `NONA_PLAYWRIGHT_MODULE`. Aucune dépendance payante requise, aucun identifiant nécessaire. Exécuter depuis la racine du dépôt ; le serveur local est configuré avec Supabase synthétique et les accès externes sont bloqués. Le mode `NONA_IMPORT_E2E_SMOKE=true` rejoue les douze parcours de 5 000 mots. Les données restent fictives.

Firecrawl reste BLOQUÉ pour les annonces Airbnb/Booking, faute de preuve d'autorisation applicable à NONA. Étude dans `nona-firecrawl-review-20261117.md`. Aucun appel ni crédit consommé ; pas de connecteur présenté comme opérationnel.

La bêta reste FERMÉE : cette recette d'import ne valide pas les contrôles encore ouverts d'isolation API et de séjour privé. Le changement PowerShell préexistant a été conservé hors de ces commits. Aucun Lovable, dépense ou paiement réel.
