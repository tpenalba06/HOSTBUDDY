# NONA — concierge cloud à la consommation, préparation du 19 octobre 2026

## État réel

**Préparé et vérifié hors dépense ; non activable en l'état.** Aucun appel réel à Haiku n'a été effectué. Aucune réponse simulée n'est présentée comme une évaluation qualitative du modèle réel. Le site public reste inchangé et guidé.

Le compte Gateway répond en lecture authentifiée, mais annonce `balance=0`, `total_used=0`. Le registre Supabase TEST est lisible, désactivé, expiré depuis le 15 octobre et à zéro réservation. Son plafond de 4 € est préservé. Le livret TEST publié est accessible. La nouvelle table d'observation n'y est pas encore disponible (HTTP 404). Les paramètres de recharge automatique, BYOK, extras, plan/confidentialité et enveloppe TTC ne sont pas attestés : aucune revue de facturation n'a été fabriquée.

Le plugin Supabase a été confirmé **installé et activé** après l'action de l'utilisateur. Au dernier inventaire, aucune opération Supabase SQL n'était exposée à cette session. Cela ne signifie pas que l'utilisateur doit réinstaller le plugin. Ne pas lui demander de recoller une clé ni d'exécuter du SQL.

## Choix du modèle

Modèle retenu : **Claude Haiku 5.5**, identifiant catalogue `anthropic/claude-haiku-5.5`. Routage préparé vers Anthropic seulement via la clé Gateway déjà enregistrée ; aucune création de compte ou de secret supplémentaire. Réutilisation de l'adaptateur et des sorties structurées existants.

Le choix combine l'orientation conversation temps réel documentée, les sorties structurées, le contexte des six langues déjà géré par NONA, le prix et la continuité technique. Il n'est pas fondé sur un benchmark de conversations hôtelières que nous aurions réalisé : ce benchmark reste à exécuter après déblocage budgétaire.

Tarifs interactifs vérifiés le 19 octobre 2026, USD par million de tokens, hors taxes, sans remise de cache :

| Solution                                    | Entrée |  Sortie | Appréciation pour NONA                                                                                                                 |
| ------------------------------------------- | -----: | ------: | -------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Haiku 5.5, contexte ≤ 100 000 tokens | 0,10 $ |  0,50 $ | Retenu ; adaptateur existant, sortie structurée, réponse rapide annoncée. Qualité réelle à mesurer.                                    |
| Claude Sonnet 5.5                           | 2,00 $ | 10,00 $ | Davantage de capacité, coût 20 fois supérieur sur ces tarifs ; aucun bénéfice démontré ici pour la réservation bornée.                 |
| GPT-5.4 mini                                | 0,75 $ |  4,50 $ | Alternative polyvalente et outils ; gain conversationnel non mesuré, plus cher pour ce scénario.                                       |
| Gemini 3.1 Flash-Lite                       | 0,25 $ |  1,50 $ | Bon candidat vitesse/traduction ; nouvelle configuration, confidentialité à vérifier par route.                                        |
| Gemini 2.5 Flash-Lite                       | 0,10 $ |  0,40 $ | Légèrement moins cher ; pas choisi sur le seul prix, ni évalué ici.                                                                    |
| Ollama Cloud GLM-5.3-flash                  | 0,15 $ |  0,50 $ | API à crédits possible sur l'offre gratuite, sans serveur GPU ni abonnement obligatoire. Pas d'accès enregistré ; qualité non évaluée. |

Ollama **local** et Ollama **Cloud** sont distincts. La gratuité des messages locaux ne s'applique pas aux tokens cloud. Ollama déclare ne pas conserver ni entraîner sur les prompts/réponses cloud. Pour Gateway, le catalogue annonce ZDR/no-training sur Haiku, mais la documentation réserve le filtre ZDR par requête aux comptes Pro/Enterprise. Le plan et l'accord applicables au compte doivent donc être vérifiés ; **aucun abonnement Pro ne sera souscrit automatiquement** et le filtre existant n'a pas été supprimé. Aucune résidence UE n'est promise.

Sources primaires consultées :

- <https://www.anthropic.com/claude/haiku>
- <https://www.anthropic.com/claude-haiku-5-5>
- <https://ai-gateway.vercel.sh/v1/models>
- <https://ai-gateway.vercel.sh/v1/models/anthropic/claude-haiku-5.5/endpoints>
- <https://ollama.com/pricing>
- <https://ai.google.dev/gemini-api/docs/pricing>
- <https://developers.openai.com/api/docs/models/gpt-5.4-mini>
- <https://vercel.com/docs/ai-gateway/pricing>
- <https://vercel.com/academy/ai-gateway/set-a-budget>
- <https://vercel.com/changelog/zero-data-retention-no-prompt-training-on-ai-gateway>

## Coûts indicatifs, pas forfaits par logement

Hypothèse centrale : **20 conversations par logement et par mois, 6 réponses IA par conversation, 5 000 tokens entrants en moyenne par réponse (instructions, schéma, catalogue et historique inclus), 180 sortants**. Aucun cache ni modèle moins cher supposé. Une conversation représente ainsi 0,00354 $ de tokens. Les tokens ne sont pas mesurés sur un appel réel pour l'instant ; la moyenne choisie doit être corrigée par la recette.

Conversion indicative : 1 € = 1,1253 $, référence BCE du 16 octobre 2026. La banque et le prestataire de paiement peuvent appliquer un taux et des frais différents. La colonne TVA est une illustration à 20 %, pas une détermination de la fiscalité du compte.

| Logements | Conversations/mois | Appels/mois | Tokens, USD HT | Équivalent EUR HT | Avec TVA illustrative de 20 % |
| --------: | -----------------: | ----------: | -------------: | ----------------: | ----------------------------: |
|        10 |                200 |       1 200 |        0,708 $ |            0,63 € |                        0,75 € |
|       100 |              2 000 |      12 000 |         7,08 $ |            6,29 € |                        7,55 € |
|       500 |             10 000 |      60 000 |        35,40 $ |           31,46 € |                       37,75 € |
|     1 000 |             20 000 |     120 000 |        70,80 $ |           62,92 € |                       75,50 € |

Hébergement web, Supabase, éventuels frais de paiement/change et options de plateforme ne sont pas inclus. Le coût varie avec l'usage : dix fois plus de conversations implique environ dix fois plus de tokens. **20 €/mois ne constitue pas une promesse de service IA illimité**, notamment pour 500 ou 1 000 logements. Le plafond entraîne alors le repli guidé.

Référence de change : <https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.eu.html>.

## Ce qui a été intégré

- La route publique existante réutilise le même guide publié, le même renderer, le même moteur de préparation et le même formulaire de réservation. Aucun changement Stripe, commission de 2 %, abonnement, import, connecteur ou DA.
- Texte social généré librement, six langues, tutoiement FR, historique borné des deux interlocuteurs et brouillons distincts. La marque interne du prompt est NONA. Correction d'une ancienne redaction qui confondait une date ISO avec un numéro de téléphone.
- Les codes Wi-Fi, contacts, reçus et corps des sections ne sont pas transmis au modèle. Les secrets connus répétés dans un message sont masqués ; noms/descriptions de services sont nettoyés. Les messages voyageurs restent transmis au fournisseur : ce nettoyage ne remplace pas un accord de traitement des données.
- L'IA sélectionne uniquement des sources et champs de brouillon. Prix, options, horaires proposés, codes et devis affichés viennent du serveur. Aucun outil du modèle ne crée une commande ou un paiement. La confirmation explicite existante demeure obligatoire et la disponibilité reste soumise au processus gestionnaire.
- Les gardes de prose refusent notamment chiffres, liens, HTML, fausses confirmations connues, prix, gratuité, affirmations de disponibilité connues et plusieurs points d'interrogation. **Ce ne sont pas une preuve sémantique contre toutes les hallucinations** : la recette du vrai modèle reste indispensable.

## Protection financière préparée

1. Aucun appel sans activation serveur explicite **et** revue de facturation datée, liée à l'empreinte de la clé et à une preuve conservée. Un solde, une clé ou l'ancien booléen d'activation ne valent pas garantie financière.
2. Revue requise du prépaiement, recharge automatique désactivée, absence de BYOK et d'extras facturables, confidentialité, conversion couvrant change/TVA/frais. Ce document est une preuve opérateur à vérifier, pas une attestation automatique du fournisseur. Il n'en existe actuellement aucune valide.
3. Réservation durable **avant** appel. TEST conserve exactement son registre cumulatif de 4 € et ses réserves de 0,02 € sans remboursement. La migration n'active ni ne renouvelle cette autorisation.
4. Mensuel : politique distincte, préparée à 20 € mais désactivée. Expiration d'approbation, compteur par mois UTC, verrou global PostgreSQL, refus avant dépassement et doublons refusés sur toutes les instances utilisant le registre.
5. Limites initiales mensuelles configurables : logement 100 appels/jour, organisation 500/jour, voyageur anonyme 30/24 h, conversation 20 appels, réseau 10/5 minutes. Cookie signé, HttpOnly/Secure/SameSite ; réseau distinct, en-têtes IP reconnus seulement pour le proxy effectivement configuré. Effacer un cookie n'efface pas le compteur réseau ni le plafond global.
6. Corps Gateway ≤ 24 576 octets, contexte utilisateur ≤ 12 000 octets, sortie ≤ 800 tokens ; 32 768 tokens entrants constituent la borne conservatrice préparée, schéma/instructions et marge de protocole inclus. Prix et modèle contrôlés avant chaque réservation ; route et modèle vérifiés sur le vrai format SDK. Pas de tool, recherche web, cache explicite, tags/reporting payant, BYOK ou modèle de secours automatique.
7. Réserve de 0,02 € par tentative. Pour la borne tokens/prix retenue et une conversion tout compris ≤ 2 €/USD, le coût calculé majoré est 0,008089 € ; le surplus reste une marge, **à condition que la revue du compte et des frais soit effectivement validée**. Ce calcul applicatif ne remplace pas la limite indépendante du financement prépayé.
8. Mesure des tokens et identifiant de génération. Lecture de la facture Gateway, sans génération supplémentaire, pour distinguer **coût USD mesuré**, **estimation** et **incertitude**. La conversion EUR est une enveloppe prudente, pas le relevé bancaire final. Mensuel : le reliquat n'est libéré qu'une fois après coût fournisseur confirmé. En cas d'estimation, indexation tardive ou panne, toute la réserve reste bloquée ; le plafond peut donc interrompre l'IA avant que les tokens réels atteignent 20 €.
9. Zéro retry de génération, délai borné, une réservation utilisable une seule fois ; panne, sortie invalide, budget vide ou registre indisponible ⇒ guidé. Si un montant observé dépasse la réserve, la politique concernée est désactivée et requiert une investigation.

Un budget Gateway souple ne suffit pas : la requête qui le franchit peut finir. Le respect **financier total** des 5 € nécessite de vérifier le compte, tous ses chemins de facturation et le financement TTC, puis d'associer cette limite indépendante au registre. Rien de cela n'est déclaré acquis sur la seule base des tests locaux.

## Validation et limites

Les résultats détaillés et le checkpoint sont dans `docs/evidence/nona-cloud-verification-20261019.json` et `nona-cloud-preflight-20261019.json`.

- Tests de base et nouveaux tests PostgreSQL embarqués, modèle simulé, six langues, changement de sujet, historique, arrivée, Wi-Fi, petit-déjeuner/massage, montants catalogue, sources étrangères, injections et panne. Les tests concurrents sont des appels concurrents simulés sur PostgreSQL embarqué, pas un test de charge multiserveur Supabase.
- Scénario de service existant rejoué par la suite Node : attribution multi-logement de même organisation, devis serveur 25 €, idempotence d'une commande simulée, reçu privé, état confirmé distinct de payé, isolation de locataire.
- TypeScript et lint des fichiers modifiés passent. Le lint global comporte 203 erreurs de formatage préexistantes dans `GuideView.tsx` et `guide-preview.tsx`, inchangés, ainsi que 23 avertissements Fast Refresh. Elles ne sont pas présentées comme de nouvelles erreurs du chantier cloud.
- Build isolé du serveur et du chat partagé avec configuration Vite locale, sans charger le wrapper d'hébergement. Smoke du serveur compilé : réponse 200, `no-store`, sources conservées, champ propriété étranger refusé, origine étrangère refusée, zéro appel modèle et zéro réseau externe.
- Contrôle navigateur tenté une fois avec sandbox active : Chrome se ferme avant création d'une page. Pas de nouvelle capture ni de certification smartphone/desktop dans cette session.
- L'installation du paquet d'hébergement Lovable a été refusée par le contrôle automatique et abandonnée. Aucune tentative de contournement ; la compilation indépendante utilise les outils locaux déjà présents. **Le build complet de l'application avec son wrapper d'hébergement n'est donc pas certifié ici.** Aucun appel ni crédit Lovable utilisé, aucun push vers sa branche connectée.
- Pas de test réel de qualité, latence, réservation cloud ou coût Haiku, puisque l'autorisation financière n'est pas démontrée. Aucun changement de production, nouvelle souscription, migration distante ni paiement.

## Reprise sans demander de code à l'utilisateur

1. Utiliser les opérations Supabase dès qu'elles deviennent réellement disponibles. Cibler exclusivement `mhhtnqfdkyudwyqlmnce`, vérifier les fonctions/droits/empreintes existants, puis appliquer la migration additive `0026` **désactivée**, sans modifier les données métier ni le registre historique. Ne jamais appliquer sur le projet production.
2. Établir la preuve de financement TTC dans la limite des 5 € déjà autorisés, sans nouveau prélèvement ou abonnement non approuvé. Vérifier le minimum de recharge, TVA/frais, recharges automatiques, BYOK, extras et confidentialité ; ne pas supposer qu'un achat de 5 $ respecte 5 € TTC.
3. Seulement après preuve complète, renouveler temporairement TEST sans remettre à zéro son compteur, armer uniquement le scope `test`, exécuter un premier appel, comparer facture/jetons/réserve puis dérouler les vrais scénarios et refermer l'autorisation.
4. Faire une recette visuelle et le build de l'application dans un environnement autorisé ; autorisation de préproduction/production distincte. Le plafond mensuel de 20 € reste inactif jusqu'à validation explicite.

Branche isolée : `feat/nona-cloud-metered-20261019`, basée sur `768b88e`. Les travaux `c857571`, `bc165ed`, `95d75d2` et l'état hébergé sont préservés, sans réécriture ni remplacement. Aucun commit d'une autre copie de travail n'a été réinitialisé.
