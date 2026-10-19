# NONA — première recette IA cloud réelle, 19 octobre 2026

État : **recette réelle réalisée sur TEST ; activation publique non prête**. Ollama Free fonctionne directement depuis le backend NONA, sans application Ollama locale ni passage par Vercel. Le fournisseur définitif reste à choisir après comparaison réelle avec Claude Haiku 5.5.

## Accès autorisé et périmètre

Après l'accord explicite « je t autorise », connexion Google à Ollama, accès au compte Free et création d'une clé serveur dédiée `NONA TEST 20261019`. Aucun moyen de paiement ajouté, paiement, abonnement payant ou recharge. Clé conservée dans le coffre local chiffré DPAPI, hors dépôt et hors navigateur client. L'autorisation TEST a été ouverte temporairement puis refermée ; aucun compteur remis à zéro. Aucune production, aucun Lovable, aucune modification Stripe, DA ou moteur Services.

Le compte présentait 100 % d'usage gratuit restant avant la recette, un solde acheté de 0 $ et la recharge automatique désactivée. Après recette : 0,2 % d'usage gratuit utilisé, solde acheté toujours nul, recharge automatique toujours désactivée. Ces valeurs sont celles de l'interface authentifiée, avec son arrondi.

Modèles explicitement accessibles au compte Free : beam, gemma4:31b, gpt-oss:120b, gpt-oss:20b, nemotron-3-nano:30b, nemotron-3-super et nemotron-3-ultra. GLM-5.3-flash n'était pas admissible à cette offre : aucun appel effectué vers ce modèle.

## Mesures réelles

| Mesure | Résultat |
| --- | ---: |
| Requêtes cloud réelles | 22 |
| Gemma 4 31B | 21 |
| GPT-OSS 20B | 1, non concluante |
| Tokens entrants Gemma | 32 790 |
| Tokens sortants Gemma | 1 961 |
| Latence Gemma, minimum / médiane / maximum | 0,740 / 0,956 / 4,483 s |
| Consommation affichée par Ollama, 22 lignes additionnées | 0,00421 $ |
| Nouvelle dépense réelle | 0 $ |

Le total fournisseur additionne les montants arrondis individuellement dans l'interface Usage ; ce n'est ni une facture ni un débit bancaire. Il est couvert par l'usage Free inclus. L'estimation Gemma calculée séparément à partir des tokens/cache est de 0,00378812 $. La requête GPT-OSS n'a pas fourni de compteurs exploitables à l'adaptateur, mais sa consommation apparaît dans le relevé fournisseur (0,00033 $). Les deux mesures sont conservées séparément.

17 réponses ont été acceptées par les validateurs du backend (16 dans les scénarios et une réponse diagnostique), cinq tours ont utilisé le repli guidé. Cet échantillon exploratoire inclut des ajustements de consigne ; ce n'est pas un taux de réussite de benchmark. « Acceptée » ne garantit pas une bonne qualité rédactionnelle : la réponse diagnostique mélangeait notamment français et anglais.

## Extrait authentique du petit-déjeuner

Voyageur : « Tu peux nous préparer un petit-déjeuner pour demain matin ? »

NONA, IA : « Rien de tel qu'un bon réveil gourmand pour bien commencer la journée ! Tu souhaites ce petit-déjeuner pour combien de personnes ? »

Voyageur : « Pour trois personnes »

NONA, IA : « C'est noté, trois gourmands ! À quelle heure souhaites-tu être servi demain matin ? »

Voyageur : « À 9h »

NONA, repli guidé : « Quelle formule te ferait plaisir ? »

La proposition structurée contenait l'heure correcte ; sa formulation libre répétait l'heure en chiffres, interdits par le garde-fou existant. Le repli a conservé le brouillon validé.

Voyageur : « Classique »

NONA, IA : « Le classique, un indémodable ! Je prépare ta demande et l'hôte reviendra vers toi pour confirmer la disponibilité. »

Le serveur a calculé le récapitulatif **75 € : trois personnes × 25 €**, demain à 09:00. La préparation arrive à l'étape prête. **Aucune commande envoyée, aucune réservation confirmée et aucun paiement.** La formulation finale doit encore mieux distinguer préparation et envoi de la demande.

## Résultats et défauts observés

- Conversation spontanée réelle et contexte suivis ; ton généralement chaleureux et tutoiement.
- Anglais, espagnol, allemand, italien et portugais ont produit des réponses réelles adaptées à la demande de petit-déjeuner. Avec le français, les six langues ont donc été exercées, sans audit linguistique exhaustif.
- Wi-Fi et informations pratiques : cartes provenant des données serveur, sans transmission du code au fournisseur.
- Massage : demande implicite de détente comprise, proposition du service existant. Un tour a annoncé une préparation alors que l'heure manquait ; le backend a refusé et repris le parcours guidé.
- Tentative d'invention d'un code d'arrivée : code non inventé, mais réponse trop affirmative sur le contenu de la carte d'arrivée. Défaut factuel à corriger avant lancement.
- Français : mélange anglais/français dans un diagnostic, un vouvoiement et répétitions de chiffres dans d'autres tours. Certains sont refusés par les garde-fous ; le mélange de langues ne l'a pas été.
- GPT-OSS 20B : un appel, réponse rejetée et compteurs absents ; 6,788 s. Aucune conclusion générale sur le modèle à partir de cet unique essai.
- Panne et transport invalide : couverture par tests déterministes, pas de panne fournisseur réelle provoquée. Smartphone et interface publique : non validés dans cette recette API.

Les données de dialogue sont synthétiques (Villa Mare). L'identifiant d'un logement TEST réel sert uniquement à l'attribution du quota. Aucun contenu privé du livret TEST n'a été transmis au modèle. Cette recette ne constitue pas un nouvel audit complet de l'isolation multi-organisations.

## Backend et protections vérifiés

Adaptateur natif Ollama limité au laboratoire : endpoint HTTPS fixe, clé serveur, une seule fonction de proposition, validation Zod puis règles métier existantes. Aucun outil de réservation ou de paiement exécutable par le modèle. Ollama Cloud ne proposant pas les sorties contraintes par schéma, les appels d'outils restent validés strictement côté NONA.

Limites : sortie 800 tokens, contexte 12 000 octets, corps 24 576 octets, réponse 65 536 octets, délai 12 secondes, aucune relance ni bascule payante automatique. Preuve de compte Free liée à la clé, modèle éligible et revue courte avant appel. Les contrôles de compte sont ceux observés au moment de la recette ; ils ne constituent pas un mécanisme permanent de synchronisation de la facturation Ollama.

Les 22 tentatives possèdent une observation durable TEST : 21 estimations de tokens et une mesure incertaine. Réserve applicative conservatrice finale : **0,44 € sur 4 €**, retenue sans restitution, distincte de toute dépense. L'autorisation TEST est désactivée après recette ; une nouvelle demande de réserve est effectivement refusée. La politique mensuelle préparée à 20 € reste désactivée. Aucune simple alerte fournisseur n'est utilisée comme plafond financier garanti.

Correction d'un défaut réel découvert : une formulation IA refusée effaçait auparavant les progrès du brouillon pourtant déjà validés. Le backend conserve maintenant le brouillon et les cartes validés, puis remplace seulement le texte rejeté par le repli guidé. Test de régression ajouté.

Validation logicielle finale : 51 tests ciblés passent dans quatre fichiers ; TypeScript et lint ciblé passent. La compilation isolée du laboratoire passe. Aucun build via l'intégration Lovable ni déploiement.

## Comparaison et décision

Gemma 4 31B est désormais un candidat **réellement testé**, rapide et économique dans cet échantillon. Les incohérences constatées empêchent de le retenir définitivement pour les voyageurs.

Claude Haiku 5.5 reste un candidat sérieux, avec adaptateur existant. Son tarif publié pour les prompts jusqu'à 100 000 tokens est de 0,10 $/million en entrée et 0,50 $/million en sortie, hors cache. À volume identique de 32 790 tokens entrants et 1 961 sortants, cela donnerait **0,0042595 $ sans cache** : comparaison arithmétique seulement, pas un coût mesuré Haiku ni une garantie de génération identique. Aucun appel Haiku facturable n'a été effectué dans cette recette gratuite. Qualité, latence et fiabilité Haiku restent à mesurer sur les mêmes scénarios avant décision finale.

Confidentialité publiée Ollama : traitement transitoire des prompts/réponses, sans entraînement annoncé ; métadonnées de compte distinctes, recours à des prestataires et transferts possibles aux États-Unis. Pas de résidence UE exclusive établie ni d'audit contractuel production. La recette utilise uniquement des données synthétiques et le contexte filtré existant.

Sources officielles : [Ollama Cloud](https://docs.ollama.com/cloud), [tarifs](https://ollama.com/pricing), [confidentialité](https://ollama.com/privacy), [conditions](https://ollama.com/terms), [outils](https://docs.ollama.com/capabilities/tool-calling), [sorties structurées](https://docs.ollama.com/capabilities/structured-outputs), [Haiku 5.5](https://www.anthropic.com/claude-haiku-5-5).

## Reprise

Preuves anonymisées dans `docs/evidence/nona-ollama-account-free-20261019.json`, `nona-ollama-live-20261019.json` et `nona-ollama-usage-after-20261019.json`. Le fichier `nona-ollama-free-recipe-20261019.json` reste une preuve distincte de préparation, avec zéro appel dans cette exécution de préparation.

Prochaine étape technique : améliorer la cohérence conversationnelle et la formulation avant envoi, puis faire une comparaison Haiku équivalente sous enveloppe strictement autorisée. Ne pas activer de consommation continue, rouvrir le TEST ni déployer implicitement à partir de ce checkpoint. Aucune nouvelle intervention technique demandée à l'utilisateur pour cette recette terminée.
