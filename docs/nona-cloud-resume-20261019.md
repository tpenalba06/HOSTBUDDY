# NONA — reprise du concierge cloud, 19 octobre 2026

État : **préparation technique avancée ; vraie IA cloud toujours bloquée avant activation**. Dépense de cette reprise : **0 €**. Aucun appel au modèle réel, aucune publication et aucun usage de Lovable.

## Travail récupéré et conservé

Le checkpoint exact était `59f84c4c40574ffacfd29815d02d5000954df476`, branche `feat/nona-cloud-metered-20261019`. Une copie indépendante a été créée dans `output/nona-cloud-resume`, branche `work/nona-cloud-resume-20261019`, avec l'historique Git complet de cette branche. Le bundle original de récupération est conservé à côté. Les travaux UX et les autres copies n'ont pas été modifiés.

## Avancée réelle de cette reprise

Les opérations SQL Supabase sont désormais accessibles. La migration préparée `0026_concierge_metered_cloud.sql` a été appliquée, uniquement sur TEST `mhhtnqfdkyudwyqlmnce`, sous le nom `concierge_metered_cloud_disabled`.

Vérifications distantes effectives :

- Les quatre tables de politique, compteur, consommation et observation ont RLS activée.
- Les rôles voyageurs et utilisateurs authentifiés n'ont pas de lecture sur ces tables.
- Les deux fonctions de réservation/comptabilisation sont exécutables seulement par le rôle serveur.
- Un appel de réservation avec la politique désactivée est refusé.
- Une observation sans réservation préalable est refusée.
- Zéro réservation mensuelle, zéro observation ; le compteur historique d'essai reste à zéro sur son plafond cumulatif de 4 €.
- La politique mensuelle de 20 € est créée **désactivée**. Aucun renouvellement de l'autorisation TEST expirée.

Les tables internes sans politique RLS sont volontairement fermées ; le contrôle de sécurité Supabase les signale à titre informatif. Les deux nouvelles fonctions ne sont pas signalées comme accessibles aux voyageurs. Les avertissements sur les fonctions métier et l'authentification existantes ne constituent pas une certification générale de la sécurité du produit. Références : [RLS sans politique](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [fonctions publiques privilégiées](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).

## Modèle et coût

**Claude Haiku 5.5 reste le modèle retenu pour la recette**, avec l'adaptateur existant. Le choix conserve les sorties structurées et le travail d'intégration déjà réalisé, à un coût textuel bas. Il ne prouve pas encore une supériorité de naturel ou de qualité hôtelière : aucun benchmark réel n'a été effectué.

Tarif primaire revérifié : 0,10 $/million de tokens entrants et 0,50 $/million sortants sous 100 000 tokens de contexte. [Anthropic](https://www.anthropic.com/claude/haiku).

Hypothèse : 20 conversations/logement/mois, 6 réponses par conversation, 5 000 tokens entrants et 180 sortants par réponse. Pas de cache, recherche ou outil externe. Coût par conversation : **0,00354 $ HT**.

| Logements | Conversations/mois | Tokens IA, USD HT/mois |
| ---: | ---: | ---: |
| 10 | 200 | 0,71 $ |
| 100 | 2 000 | 7,08 $ |
| 500 | 10 000 | 35,40 $ |
| 1 000 | 20 000 | 70,80 $ |

Ce sont des projections, pas des factures observées. Change, taxes, frais et hébergement sont exclus. Un usage cinq fois supérieur multiplie ces montants par cinq. Le plafond de 20 € provoquera le repli guidé lorsqu'il sera atteint ; il ne signifie pas IA illimitée pour tous les volumes.

Ollama Cloud propose également une offre sans abonnement avec crédits à l'usage ; ses tarifs GLM-5.3-flash sont 0,15 $ entrant / 0,50 $ sortant par million. Aucun accès cloud Ollama n'a été créé ou utilisé. Sa qualité n'a pas été comparée réellement à Haiku. [Ollama](https://ollama.com/pricing). Le comparatif préparatoire des autres modèles reste dans `docs/nona-cloud-metered-20261019.md` ; ses résultats qualitatifs sont provisoires.

## Blocages désormais démontrés

Lecture du compte Vercel existant, sans modification :

1. **Solde 0,00 $.**
2. Le formulaire de recharge personnalisée refuse 1 $ et affiche **« Minimum amount is $10 »**. La recharge automatique est désactivée. Aucun achat n'a été validé.
3. Le compte est **Hobby**. Le filtre `zeroDataRetention: true` utilisé dans le code est réservé à Pro/Enterprise ; les réglages de confidentialité du compte affichent également cette restriction. [Documentation ZDR](https://vercel.com/docs/ai-gateway/security-and-compliance/zdr).
4. La page propose aussi des crédits gratuits avec vérification de carte et accès limité aux modèles. Leur disponibilité pour Haiku et leur compatibilité avec la route de confidentialité ne sont pas établies ; aucun crédit gratuit n'a été activé.
5. La revue complète de financement TTC, frais, éventuels suppléments et confidentialité n'est pas acquise. Aucune attestation d'enveloppe financière n'a été fabriquée.

**Une recharge de 10 $ seule ne résoudrait donc pas tout.** Elle excède le budget existant de 5 € et ne rend pas Hobby compatible avec le filtre ZDR. Aucun abonnement Pro n'est proposé comme préalable automatique. Il faut établir une route fournisseur et un financement compatibles avant toute activation.

## Tests réellement refaits

- **81 tests Vitest ciblés, 11 fichiers : tous passent.** Compréhension simulée, six langues, historique, changements de sujet, arrivée/Wi-Fi, petit-déjeuner/massage, refus de sources étrangères, quotas, concurrence sur PostgreSQL embarqué, facturation et panne.
- **1 test Node du parcours Services : passe.** Attribution multi-logement d'une même organisation, devis serveur de 25 €, une seule commande sur relance, reçu privé, confirmation distincte du paiement, isolation entre locataires.
- TypeScript : passe.
- Compilation isolée du serveur et du chat partagé : passe, sans charger l'intégration Lovable.
- Smoke du serveur compilé : HTTP 200, repli guidé, sources Wi-Fi conservées, `no-store`, origine et propriété étrangères refusées, zéro appel externe.

Ces tests n'établissent ni la qualité de Haiku, ni sa latence, ni son coût mesuré. Les tests de concurrence utilisent PostgreSQL embarqué ; les vérifications distantes TEST couvrent les droits et le refus lorsque désactivé, pas une charge multiserveur avec IA active.

Un lanceur de recette locale a été ajouté : `scripts/validation/nona-cloud-preview.mjs`. Il compile le vrai GuideView et utilise le vrai endpoint compilé avec la source de démonstration Villa Mare. Il bloque les appels externes et affiche explicitement le repli guidé et les données fictives. Il ne constitue pas une vraie IA et ne crée aucune réservation réelle.

La compilation du lanceur et son démarrage passent. La recette visuelle a été tentée : le navigateur ne peut pas joindre son adresse locale ; le contrôle réseau local retourne une interdiction de socket. Aucun contournement ni modification des protections. **Pas de validation smartphone/ordinateur dans cette reprise.** Le build complet avec l'intégration d'hébergement n'a pas été relancé ou certifié.

## Limites et reprise exacte

Le moteur Services, Stripe Connect et la commission de 2 % sont conservés. Les prix, codes et confirmations restent issus des processus serveur existants. Les gardes sur le texte libre ne démontrent pas l'absence sémantique de toute hallucination.

Prochaine étape indépendante : choisir ou établir une route de facturation/confidentialité utilisable avec les accès autorisés. Si elle implique un financement supérieur à 5 €, une nouvelle souscription, une carte ou un contrat, regrouper ces éléments pour une seule validation humaine concrète. Ne pas demander à l'utilisateur de copier des secrets ni d'exécuter SQL.

Seulement après financement et confidentialité vérifiés : renouvellement TEST temporaire sans remise à zéro du compteur, premier appel réel, rapprochement coût/réserve, conversations et réservations réelles de recette, puis fermeture de l'autorisation.

Le plafond mensuel de 20 € et la publication nécessitent leurs autorisations distinctes. Aucun push vers la branche synchronisée Lovable et aucune modification de production.

