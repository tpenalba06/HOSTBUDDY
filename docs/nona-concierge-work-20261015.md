# NONA — reprise Work et concierge, 15 octobre 2026

## Résultat et limite principale

Le concierge existant dispose maintenant d'un dialogue progressif en six langues, d'une voix NONA centralisée, de cartes issues du catalogue, d'un récapitulatif compact et d'un adaptateur de compréhension par modèle. **Le modèle externe n'est pas activé ni validé en conditions réelles.** La prévisualisation fonctionne en mode guidé, explicitement annoncé. Dépense IA externe : **0 €**, zéro requête d'inférence.

Prévisualisation locale sur le PC de développement : **http://127.0.0.1:4179/demo**. Aucun déploiement en production. Il ne s'agit pas d'une URL accessible depuis un autre appareil. Aucun projet HOSTBUDDY n'est accessible dans le périmètre Vercel examiné ; aucune nouvelle ressource payante ou publication n'a été créée pour contourner cette limite.

Parcours : ouvrir Nona, écrire « Je voudrais un petit-déjeuner », puis « Trois », « demain », « vers 9 h », « Classique ». Les coordonnées et l'acceptation des conditions apparaissent au récapitulatif. « Oui » n'envoie rien. Après le bouton explicite, onglet Gestionnaire → Commandes → Confirmer ; retour Voyageur → Nona → simulation de paiement TEST. Tout reste dans la mémoire du navigateur.

## Reprise du travail

- Le checkout local était propre sur `5a842e3`. Un bundle Git de récupération a été conservé avant la mise à jour.
- Le HEAD distant réel était `0a1ee072`; récupération par avance rapide, sans réécriture d'historique. Les changements `d26f515`, `1079a896` et le début de personnalité ont été conservés.
- Régression prouvée : `ConciergeTurn` exigeait `persona`, `personaVersion`, `nextStep` et `choices`, mais le validateur ne les retournait pas. TypeScript échouait. Ce contrat est maintenant effectivement produit.
- Les cinq RPC Services, les champs catalogue/réservation et les wrappers de clients sont présents dans `service-database.ts`. Ils correspondent aux contrats acquis. Aucun retour au schéma généré incomplet, aucun cast destiné à contourner une réservation.
- Les routes `orders`, `order-status`, les wrappers Services, les types générés et le moteur Stripe ne sont pas modifiés par ce lot. `ServiceBookingForm` reste le seul formulaire et le seul chemin d'envoi, avec identité de demande, reçu privé, calcul SQL et confirmation du gestionnaire acquis.
- Aucune migration distante exécutée. La validation antérieure de `0023` sur Supabase TEST reste acquise ; elle n'a pas été rejouée. `0024` est une nouvelle migration préparée, testée uniquement dans PostgreSQL embarqué local.
- Aucun appel au connecteur Lovable, aucun message à son agent, aucune génération ou consommation de crédit Lovable.

## Fonctionnalités réellement implémentées

- Français tutoyé dans le chat et le récapitulatif. Accueil « Coucou », plusieurs variantes, ton sérieux en cas de détresse. La personnalité est versionnée dans `nona-personality.ts`.
- Questions successives selon les champs manquants : quantité, date, horaire, formule. Les choix affichés viennent du catalogue ; les dates/heures sont rapprochées des vrais créneaux dans le fuseau annoncé. Les heures locales ambiguës ou inexistantes ne sont pas converties silencieusement.
- Réponses courtes comme « Trois », « demain », « 9 h », corrections de quantité/date et reprise d'un service précédent. Mémoire des quatre derniers brouillons en RAM ; historique envoyé au modèle borné à six messages utilisateur. Aucun reçu ni statut de commande dans cette mémoire destinée au modèle.
- Le formulaire partagé apparaît pour le récapitulatif ; options/date/conditions restent consultables et modifiables. Les coordonnées et l'acceptation des conditions restent nécessaires. Le montant vient du serveur avec la formule existante ; le SQL de réservation conserve l'autorité finale.
- Wi-Fi publié repris littéralement, bouton de copie ; contact réel et instructions publiées pour les problèmes. Une information absente ne devient jamais une affirmation.
- Cartes de bonnes adresses avec catégorie italienne vérifiée dans les données, adresse, itinéraire HTTPS et photo publiée lorsqu'elle existe. Aucune recherche externe ni adresse inventée.
- Suivi privé et paiement par les transports existants ; aucune commande ni confirmation de paiement par le modèle. Stripe Connect et la commission de 2 % restent inchangés.

## Modèle et distinction IA/règles

Adaptateur serveur préparé : **Claude Haiku 5.5 via Vercel AI Gateway**, utilisant le paquet `ai@7.0.137` déjà ajouté par les commits récupérés. La documentation incluse dans cette version a été lue ; aucun nouveau SDK ni abonnement n'est nécessaire dans le code de ce lot.

Le modèle interprète les formulations, propose des identifiants/intention/champs structurés et peut composer une courte ouverture sociale à partir de clauses autorisées. Le validateur recalcule la prochaine question, les faits, les créneaux et les montants depuis le catalogue publié.

**L'improvisation libre des réponses n'est pas implémentée.** Elle serait incompatible avec l'affirmation que du texte généré arbitraire ne peut jamais inventer un fait. La voix et les questions restent composées par le serveur ; une ouverture factuelle ou une promesse produite par le modèle est rejetée. Ce choix doit être évalué avec les conversations du vrai modèle avant de prétendre satisfaire la fluidité générale souhaitée.

État des preuves : le transport modèle, ses sorties structurées, les erreurs, les refus de budget et la reprise guidée sont testés avec un fournisseur simulé. Les quatorze conversations et les essais navigateur utilisent les règles. Aucun test réel ne prouve encore la compréhension des fautes ou intentions implicites par Haiku, sa qualité multilingue, sa latence ou son coût mesuré.

Le mode guidé reconnaît notamment faim, petit-déjeuner, massage, arrivée anticipée, Wi-Fi, adresses et corrections usuelles. Ces règles ne sont pas présentées comme une compréhension générale.

## Budget : blocage sûr avant tout appel

`0024_concierge_budget.sql` prépare un registre durable, inaccessible aux voyageurs :

- Autorisation désactivée par défaut, expiration obligatoire, plafond cumulatif de **4 € réservés**, inférieur aux 5 € autorisés.
- Réservation fixe conservatrice de **0,02 € par tentative**, sans restitution en cas d'erreur ou d'usage incertain. Un verrou de ligne global sérialise autorisation, plafond, quotas et déduplication ; le plafond ne repart jamais à zéro au changement de jour.
- Quotas de recette : 100 tentatives/jour/organisation, 30/jour/logement, 20/jour/conversation, 10/5 minutes/empreinte. Changer d'instance ne supprime pas ces compteurs. Ce sont des quotas de recette ; la politique commerciale devra être dimensionnée séparément.
- Métadonnées de compteurs supprimées après trente jours, cumul global conservé. Aucun message, nom, code Wi-Fi ou reçu dans le registre.
- Une seule tentative SDK, pas de relance automatique, sortie plafonnée à 800 jetons, contexte borné, délai maximal de huit secondes. Les rafraîchissements de prix, suivis privés et urgences connues ne passent pas par le modèle.
- Vérification du tarif public avant chaque réservation ; refus si le modèle manque, si le prix augmente au-delà de l'enveloppe ou si l'engagement « sans entraînement » manque. Routage unique Anthropic, refus d'entraînement et contrainte de rétention nulle. La contrainte ZDR peut nécessiter un forfait existant compatible ; aucun forfait ne sera acheté.
- Une clé seule n'active rien : code verrouillé sur Supabase TEST `mhhtnqfdkyudwyqlmnce`, activation serveur distincte, registre activé et enveloppe de facturation vérifiée nécessaires. Les variables de configuration sont documentées dans `.env.example` et ne sont jamais publiques.

**Ce registre limite les réservations applicatives, pas une facture externe par magie.** Il manque la vérification des conditions du compte fournisseur : change USD/EUR, frais/taxes, prix routé, nombre de tentatives internes, engagement de non-entraînement/rétention et plafond externe. La valeur `NONA_AI_BILLING_ENVELOPE=verified-eur-ceiling-v1` ne doit être fournie qu'après preuve que chaque tentative reste sous sa réservation en euros. Sans cette preuve, pas d'activation, même avec une clé. Aucun paramètre présent aujourd'hui ne remplit ces conditions.

Le test local envoie 205 réservations concurrentes : exactement 200 sont admises et le cumul s'arrête à 4 000 000 micro-euros. PGlite exécute PostgreSQL dans un processus local ; cela valide le SQL et la file de requêtes, pas une recette réseau Supabase avec plusieurs serveurs réels. Cette dernière reste nécessaire avant activation.

## Comparaison économique indicative

Tarifs publics vérifiés le 15 octobre 2026. Hypothèse : six tours par conversation, moyenne de 2 000 jetons d'entrée et 200 de sortie par tour, sans recherche web, cache payant ou outils externes. USD, hors change, taxes, hébergement, base et frais éventuels. Ce sont des prévisions, pas des consommations observées.

| Modèle                      | Entrée / million | Sortie / million | Conversation estimée | 100 logements/mois | 1 000 |  10 000 |
| --------------------------- | ---------------: | ---------------: | -------------------: | -----------------: | ----: | ------: |
| Haiku 5.5, choix provisoire |           0,10 $ |           0,50 $ |             0,0018 $ |             5,40 $ |  54 $ |   540 $ |
| GPT-6 Luna, alternative     |           0,10 $ |           0,50 $ |             0,0018 $ |             5,40 $ |  54 $ |   540 $ |
| Gemini 3.5 Flash-Lite       |           0,30 $ |           2,50 $ |             0,0066 $ |            19,80 $ | 198 $ | 1 980 $ |

Le tableau suppose **30 conversations/logement/mois**. À 100 conversations, multiplier par 3,33 : Haiku environ 18 / 180 / 1 800 $. Les offres gratuites non garanties contre l'entraînement ne sont pas retenues pour les échanges voyageurs. La latence et la qualité réelle des trois modèles ne sont pas mesurées ici ; aucune supériorité n'est revendiquée sur ces points. Une enveloppe d'essai de 5 € ne constitue pas un budget d'exploitation permanent.

Sources primaires : [Haiku sur AI Gateway](https://vercel.com/ai-gateway/models/claude-haiku-5.5), [tarifs Anthropic](https://www.anthropic.com/claude-haiku-5-5), [tarifs OpenAI](https://developers.openai.com/api/docs/pricing), [tarifs Google](https://ai.google.dev/gemini-api/docs/pricing), [catalogue Gateway](https://ai-gateway.vercel.sh/v1/models).

## Tests et preuves

- **66 tests ciblés / 10 fichiers, zéro échec final.** Dialogue six langues, dates/heures/options, mémoire, informations absentes, urgence, sources non fiables, génération factuelle rejetée, dépassement de contexte, panne fournisseur, quotas, concurrence et contrats Services acquis.
- **14 conversations / 67 tours**, capturés par les tests : [transcription complète](./nona-conversations-20261015.md) et [données structurées](./evidence/nona-conversations-20261015.json).
- Chromium **360, 390, 430 et 1280 px** : conversation complète jusqu'à la demande, double clic, confirmation gestionnaire et paiement simulé, réouverture préservée. Zéro erreur JavaScript, débordement horizontal ou mutation réseau. Une vérification supplémentaire à 390 px et une inspection visuelle ont été réalisées après les derniers ajustements.
- TypeScript, build client/serveur et inventaire de 25 migrations passent. Lint zéro erreur, 23 avertissements hérités des fichiers existants au HEAD récupéré.
- Aucune suite financière, Billing, RLS générale, offline ou mobile antérieure relancée. Les nouveaux tests de droits du registre IA concernent uniquement ce nouveau registre.
- Preuves anonymisées : [bilan JSON](./evidence/nona-concierge-work-20261015.json). Les captures navigateur restent des pièces internes de recette.

## Mascotte et suite nécessaire

La planche **NONA DA FINALE** a été retrouvée et inspectée : le personnage officiel y est présent. Elle est une image de composition complète ; elle ne fournit pas de portrait détouré ni de séquence animée séparée. Aucun faux personnage, découpage génératif, nouvelle palette ou refonte du guide.

L'invitation « Coucou ! Une question ? 👋 », son apparition/disparition, l'emplacement portrait dans le chat et la gestion de réduction des animations sont conservés et testés. `nona-assets.ts` attend les fichiers officiels séparés du portrait et du coucou. Le personnage ne peut pas être annoncé comme animé dans cette livraison.

Pour terminer la recette IA réelle : fournir un accès serveur à un compte fournisseur existant compatible, vérifier l'enveloppe de facturation, appliquer **uniquement sur TEST après lecture de l'état de migration** le nouveau registre et sa recette réseau, puis réaliser les conversations réelles sous le plafond. Ne pas envoyer de clé dans le chat. Aucun achat de crédits, abonnement, nouveau moyen de paiement ou activation commerciale n'est autorisé par ce document.

Le lot reste sur `feat/guest-guide-v2-lot1`. Pas de merge main, de paiement réel, de Stripe Live, de migration commerciale ou de déploiement en production.
