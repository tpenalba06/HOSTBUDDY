# NONA — fiabilisation et seconde recette gratuite, 20 octobre 2026

**Le petit-déjeuner passe désormais de bout en bout en véritable IA, sans repli guidé dans la seconde recette. L'activation publique reste non prête.** Travaux repris du checkpoint `35fe8bf`, dans la branche isolée existante. Aucun changement de production, Stripe, Services, DA ou Lovable.

## Conversation réellement obtenue

Voyageur : « Tu peux nous préparer un petit-déjeuner pour demain matin ? »

NONA, IA : « C'est une merveilleuse idée pour bien commencer la journée ! Pour combien de personnes dois-je préparer cela ? »

Voyageur : « Pour trois personnes »

NONA, IA : « C'est noté, trois gourmands ! À quelle heure souhaites-tu être servi ? »

Voyageur : « À 9h »

NONA, IA : « C'est parfait, je note l'heure. Maintenant, dis-moi quelle option tu préfères pour ton petit-déjeuner ? »

Voyageur : « Classique »

NONA, IA : « Un choix tout en simplicité et efficacité, j'adore ! J'ai tout préparé dans le récapitulatif ci-dessous ; jette-y un œil et valide si cela te convient, car rien n'a encore été envoyé. »

Le serveur calcule **75 €**, trois personnes × 25 €, pour le lendemain à 09:00 en Europe/Paris. Le brouillon arrive à `ready`. **Aucune demande envoyée, réservation créée ou paiement effectué.** Les données sont celles de la Villa Mare synthétique, sans données privées de voyageurs.

## Changements techniques

Personnalité commune versionnée `nona-voice-2026-10-20.1`, réutilisée par les adaptateurs existants : langue explicitée, titres des rubriques distingués de leur contenu inconnu, question correspondant au seul champ manquant et obligation de rappeler l'absence d'envoi au récapitulatif. Les formulations restent générées librement par l'IA.

Nouveaux contrôles serveur :

- Repérage lexical de certains segments dans une autre langue, notamment le mélange anglais/français observé le 19 octobre.
- Vérification que le texte de la question porte bien sur personnes, jour, heure ou formule, en plus du champ structuré déjà validé. Une incohérence conserve le brouillon validé et déclenche le repli.
- Présence d'une mention explicite de non-envoi à l'étape prête ; refus de certaines affirmations d'envoi ou de contact avec l'hôte.
- Refus de promesses sur le contenu exact ou l'exhaustivité d'une rubrique dont le modèle ne connaît que le titre.

Ces contrôles sont **des heuristiques prudentes, pas une preuve sémantique ni un détecteur universel de langues**. Ils peuvent manquer des variantes ou provoquer un repli inutile. Aucun appel IA de vérification supplémentaire, aucune relance automatique ou nouvelle dépendance payante.

Une relecture hors ligne des réponses sauvegardées permet de vérifier les nouveaux refus sans réinterroger le fournisseur. Elle contrôle seulement les formulations enregistrées ; elle ne simule pas une nouvelle conversation ni la validation métier complète. Un faux positif sur une transition Wi-Fi a été identifié et corrigé : proposer de regarder une fiche ne doit pas équivaloir à affirmer qu'elle contient tout.

## Seconde recette réelle

Compte Ollama revérifié par son interface authentifiée avant les appels : **Free, 0 $ de crédit acheté, recharge automatique désactivée, Gemma 4 31B admissible**. Clé serveur existante réutilisée depuis le coffre chiffré ; aucune nouvelle clé, carte, acceptation contractuelle, souscription ou recharge.

Autorisation TEST ouverte dix minutes au maximum, compteur conservé ; session limitée à huit appels dans le lanceur de cette recette. **Sept appels ont réellement été effectués**, puis TEST a été désactivé explicitement.

| Mesure | Seconde recette |
| --- | ---: |
| Appels cloud Gemma réels | 7 |
| Tokens entrants / sortants | 12 595 / 718 |
| Latence minimum / médiane / maximum | 0,674 / 0,818 / 2,439 s |
| Estimation technique avec cache | 0,00144282 $ |
| Consommation affichée par Ollama | 0,00149 $ |
| Nouvelle dépense | **0 $** |

Le montant fournisseur est la somme de sept lignes individuellement arrondies du relevé, financées par l'offre Free. Ce n'est pas un débit bancaire. Le compte affiche désormais 28 appels Gemma et un GPT-OSS, soit **29 appels cumulés**, pour **0,00570 $ de consommation affichée cumulée** sur les deux recettes. Usage Free affiché : toujours 0,2 % utilisé, valeur arrondie.

Le petit-déjeuner a produit quatre réponses IA successives, avec le contexte et le prix serveur corrects. La demande implicite de détente après un trajet a proposé le massage existant et demandé le jour en français, sans mélange de langues dans ce nouvel échantillon. Le premier tour anglais du petit-déjeuner est naturel et demande seulement le nombre de personnes.

### Défauts encore constatés

La demande d'inventer un code de boîte à clés n'a pas produit de faux code, mais le modèle a encore affirmé que la rubrique arrivée contenait toutes les informations nécessaires. Cette sortie était acceptée pendant la seconde recette. **Le contrôle a ensuite été étendu à « section/rubrique » ; cette réponse est désormais refusée en relecture hors ligne. Aucune nouvelle génération n'a été effectuée après cette dernière correction.** Il faut encore améliorer le traitement des questions précises sans réponse connue.

Une question d'allergie formulée « sans danger » a déclenché le parcours d'urgence guidé existant, sans appel au modèle : réponse prudente mais disproportionnée à une question préventive. Ce défaut de classification est consigné ; il n'a pas été corrigé dans ce lot afin de ne pas modifier à la hâte les règles d'urgence. Aucun conseil médical ni garantie d'absence d'allergènes n'a été donné par l'IA.

Cette seconde recette ne prétend pas valider une conversation longue, tous les changements de sujet, les six langues de nouveau, le paiement ni le rendu smartphone/ordinateur. Les cinq autres langues ont été exercées dans la première recette ; seule l'anglais a été réexercé ici en plus du français.

## Budget et état distant final

Vérification Supabase TEST effective après clôture : **29 tentatives et 29 observations**, autorisation `enabled=false`, réserve conservatrice **0,58 € sur 4 €**, politique mensuelle de 20 € toujours désactivée. Cette réserve applicative est une enveloppe de sécurité retenue, pas une dépense. Une nouvelle tentative de réserve après clôture est réellement refusée. Aucun compteur remis à zéro, aucun schéma ou permission modifié.

Validation logicielle : **148 tests passent dans 13 fichiers**, couvrant le concierge, ses budgets et ses adaptateurs ; TypeScript et lint ciblé passent ; compilation isolée du laboratoire sans lecture du coffre. La relecture hors ligne porte sur 24 réponses historiquement acceptées : 20 restent acceptées et quatre sont maintenant refusées, dont le mélange de langues, deux promesses sur une rubrique et une formulation de récapitulatif sans limite d'envoi. Cela ne constitue pas un nouveau taux de réussite du modèle. Deux simulations anciennes ont été mises à jour pour exprimer la nouvelle obligation de non-envoi et la nouvelle version de personnalité ; les assertions de prix et de sécurité restent conservées.

## Décision et reprise

Gemma progresse sur le parcours commercial principal ; le fournisseur définitif n'est toujours pas choisi. **Haiku 5.5 demeure candidat sérieux, sans mesure réelle de qualité ou de latence dans ce chantier.** Aucun appel Haiku payant ni recharge Vercel n'a été effectué. Une comparaison réelle exige un accès compatible avec le budget expressément autorisé et un plafond garanti ; rien de tel n'est activé implicitement.

Les preuves nouvelles sont conservées séparément de celles du 19 octobre : `nona-ollama-live-20261020.json`, `nona-ollama-account-free-20261020.json`, `nona-ollama-usage-after-20261020.json` et `nona-dialogue-replay-20261020.json` dans `docs/evidence`.

Reste avant activation publique : traiter les questions précises sans réponse, revoir le faux signal d'urgence, comparaison Haiku équivalente, validation du vrai parcours dans les navigateurs et audit final de l'isolation/confidentialité. Le backend Ollama reste réservé au laboratoire ; aucune route publique ni activation continue ajoutée.
