# NONA — voie directe Ollama Cloud Free, 19 octobre 2026

**Préparation prête ; première conversation réelle en attente d'accès et d'accord. Aucun fournisseur définitif choisi. Dépense : 0 €.**

## Accès et limites de l'offre gratuite

La documentation officielle décrit une API cloud directe sur `https://ollama.com/api/chat`, sans application Ollama locale et sans Vercel. L'offre Free annonce des crédits de départ, un sous-ensemble de modèles et une requête concurrente. La page publique n'indique ni le montant exact de ces crédits ni une liste authentifiée des modèles gratuits pour notre compte. Le catalogue public complet ne prouve pas l'accès Free.

Le navigateur demande une connexion. Aucune clé Ollama n'est disponible dans l'environnement ni dans le coffre du chantier déjà autorisé. Cela ne prouve pas que l'utilisateur ne possède aucun compte Ollama. Aucun bouton OAuth susceptible de créer automatiquement un compte n'a été utilisé. Aucun compte, clé, moyen de paiement, abonnement ou crédit acheté n'a été créé.

Sources : [Cloud](https://docs.ollama.com/cloud), [tarifs](https://ollama.com/pricing), [catalogue](https://ollama.com/api/tags).

## Confidentialité vérifiée dans les documents

Ollama annonce un traitement transitoire des prompts/réponses, sans conservation au-delà de la requête et sans entraînement. Les métadonnées techniques et de compte sont conservées séparément. La politique prévoit des prestataires d'inférence et des transferts aux États-Unis ; aucune résidence UE exclusive n'est promise. Ce sont les engagements publiés, pas un audit indépendant ni une validation contractuelle de NONA en production.

La recette préparée utilise uniquement des visiteurs et contenus fictifs Villa Mare. Elle réutilise le filtrage du contexte du backend : ni codes Wi-Fi, ni coordonnées de l'hôte, ni reçu privé ne sont fournis au modèle. Les cartes pratiques continuent de provenir des données fiables du serveur.

Sources : [confidentialité](https://ollama.com/privacy), [conditions](https://ollama.com/terms).

## Candidats et comparaison à Haiku

**Gemma 4 31B est le premier candidat de recette, sous réserve d'éligibilité Free.** Son support multilingue et ses appels de fonctions sont documentés par Google ; le catalogue Ollama le déclare compatible conversation et outils. GPT-OSS 20B et GLM-5.3-flash sont préparés comme candidats secondaires, sans basculement automatique.

| Candidat | Entrée / million | Sortie / million | Conversation illustrative |
| --- | ---: | ---: | ---: |
| Claude Haiku 5.5 | 0,10 $ | 0,50 $ | 0,003540 $ |
| Gemma 4 31B, Ollama | 0,14 $ | 0,40 $ | 0,004632 $ |
| GPT-OSS 20B, Ollama | 0,07 $ | 0,30 $ | 0,002424 $ |
| GLM-5.3-flash, Ollama | 0,15 $ | 0,50 $ | 0,005040 $ |

Hypothèse identique : six réponses, chacune avec 5 000 tokens entrants et 180 sortants, sans cache, hors taxes et frais. Ce sont des estimations au tarif public, pas des consommations mesurées. Des crédits inclus peuvent financer l'essai sans sortie d'argent ; ils ne rendent pas la consommation technique nulle.

Haiku reste un candidat sérieux : l'adaptateur et les sorties structurées sont déjà préparés. **Aucun classement de qualité, latence ou fiabilité n'est établi**, puisque les deux modèles n'ont pas encore été comparés par de vraies conversations NONA.

Sources : [Gemma, fiche Google](https://ai.google.dev/gemma/docs/core/model_card_4), [tarifs Ollama](https://ollama.com/pricing), [Haiku](https://www.anthropic.com/claude/haiku).

## Préparation technique terminée

Ajouts isolés, sans modification de l'interface, Stripe ou du moteur Services :

- `src/lib/concierge-ollama-free.server.ts` : adaptateur natif direct, uniquement accessible au laboratoire TEST.
- `src/lib/concierge-ollama-free.server.test.ts` : tests du transport et de ses refus.
- `scripts/validation/nona-ollama-free-recipe.mjs` : compilation et recette reproductible, mode préparation par défaut.
- `docs/evidence/nona-ollama-free-recipe-20261019.json` : preuve de préparation avec zéro appel réel.

La documentation précise qu'Ollama Cloud ne prend pas encore en charge les sorties contraintes par schéma. Le transport expose donc une seule fonction de proposition, `submit_nona_proposal`, et valide strictement ses arguments avec le schéma NONA existant. Cette fonction ne réserve rien, n'envoie rien et ne paie rien. Une sortie textuelle seule, plusieurs appels, un outil inconnu ou une fausse confirmation déclenchent le refus et le repli guidé. Aucun agent d'exécution supplémentaire n'est créé.

La recette réutilise `runConciergeModel`, le contexte filtré, les validateurs de dialogue, la source Villa Mare et les RPC de réserve/observation TEST déjà installés. La réserve conservatrice de 0,02 € par tentative reste retenue dans le registre d'essai ; elle ne représente pas un prélèvement réel.

Avant tout appel : clé serveur, preuve de compte Free, modèle gratuit admissible, crédits inclus suffisants, absence de crédit acheté/moyen de paiement/facturation automatique, revue de confidentialité et autorisation TEST durable valide. Cette revue est liée à la clé et limitée à quinze minutes. **Ces assertions doivent être prouvées par l'état réel du compte ; aucun fichier d'approbation n'a été fabriqué.** Le code ne renouvelle pas l'autorisation TEST actuellement désactivée.

Corps limité à 24 576 octets, contexte à 12 000 octets, sortie demandée à 800 tokens, réponse bornée, une seule tentative, pas de retry ni de fournisseur de secours, redirections interdites, délai de douze secondes. Les limites réellement appliquées par le cloud devront être vérifiées au premier appel.

Sources : [outils](https://docs.ollama.com/capabilities/tool-calling), [absence de sorties structurées cloud](https://docs.ollama.com/capabilities/structured-outputs).

## Mesure et preuves

L'adaptateur relève les compteurs de tokens entrants, cache et sortants, ainsi que la latence. Il sépare tentatives réservées et requêtes réseau effectivement tentées. Le calcul au tarif public reste explicitement une **estimation** ; le débit du compte reste inconnu tant qu'il n'a pas été rapproché de son relevé. Aucune économie ou facture mesurée n'est déduite arbitrairement des tokens.

Validation : **23 nouveaux tests passent**. Le lot précédent de tests communs avec l'adaptateur Haiku a également passé avec l'ajout initial. TypeScript et lint des nouveaux fichiers passent. Le lanceur compilé s'exécute en préparation et constate zéro clé disponible, zéro appel modèle et zéro nouvelle dépense.

Scénarios prêts : conversation spontanée suivie, Wi-Fi/arrivée, information manquante et tentative d'invention, petit-déjeuner avec correction du nombre de personnes, massage puis changement de sujet, anglais/espagnol/allemand/italien/portugais. Arrêt de la recette au premier repli guidé ; aucune réponse simulée présentée comme réelle.

## Accord indispensable et reprise

L'utilisateur a explicitement demandé de suspendre toute création de compte ou acceptation contractuelle jusqu'à son accord. Il faut donc autoriser l'accès à un compte existant, ou la création d'un compte Free si nécessaire, l'acceptation des conditions Ollama et la création de la clé serveur pour cette recette, **sans carte, paiement, abonnement ni recharge**.

Après cet accord seulement : vérifier l'état réel du compte, l'éligibilité gratuite et les crédits ; arrêter si une carte, un paiement ou une autre condition non autorisée apparaît. Préparer une preuve fidèle, renouveler temporairement le registre TEST sans réinitialiser le compteur, exécuter le premier appel puis rapprocher tokens et relevé. Le fournisseur définitif reste à choisir après la démonstration réelle.

Aucun changement de Supabase distant dans ce lot, aucun Lovable, aucune production, aucun changement Stripe/DA/Services.

