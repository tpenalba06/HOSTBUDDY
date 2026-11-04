# Nona — concierge conversationnel, première version guidée

Branche : `feat/guest-guide-v2-lot1`. Base préservée : `ef99bf00987af74bd16a4ec9e4ce200794718d0c`, contenant le lot Services `b8ac0af`. Le commit qui introduit ce document est le checkpoint du chantier.

## Ce qui fonctionne

- Ouverture/fermeture du chat dans le guide public et dans la démo Villa Mare. Conversation bornée à douze messages ; sélection conservée à la fermeture. Seuls le service choisi et ses paramètres sont conservés en session : aucun transcript, nom, contact ou jeton de suivi dans ce nouvel espace de stockage.
- Réponses guidées sur le contenu publié : Wi-Fi, arrivée/départ, piscine, stationnement, équipement, adresses et contact. Les extraits viennent du livret, les traductions publiées non périmées sont utilisées quand disponibles ; sinon la langue source est annoncée. Une information absente reste absente, avec accès au gestionnaire.
- Reconnaissance guidée des services et du petit-déjeuner dans les six langues, quantité/date relative/heure et option libellée explicitement. Ces règles sont limitées et ne constituent pas une compréhension générale par un modèle IA.
- Cartes illustrées issues du catalogue actuel, préremplissage et personnalisation dans la conversation. Les services désactivés/non attribués sont exclus par le même RPC que le livret ; les services sans aucun créneau futur ne sont pas proposés.
- Le formulaire `ServiceBookingForm` est **le formulaire Services existant extrait de son tiroir**, pas un second moteur. Catalogue classique et chat partagent les options, conditions, demande, identifiant idempotent, reçu privé et statuts. « Oui » dans le chat n’envoie rien. Un clic explicite sur la confirmation reste obligatoire.
- Aperçu calculé sur le serveur à partir du catalogue frais, avec la fonction de prix partagée. Un changement de sélection invalide cet aperçu ; un changement de révision bloque la soumission. Le montant définitif est toujours recalculé par le SQL de réservation existant.
- Suivi réel via `/api/public/order-status`, rafraîchissement à la demande, toutes les quinze secondes sur page visible et au retour du focus. Aucun statut conservé localement ne vaut confirmation serveur. Le lien de paiement apparaît seulement pour une demande confirmée avec un paiement émis ; depuis le chat il ouvre un autre onglet pour conserver la conversation. Stripe Checkout, Connect, les webhooks et la commission 2 % sont inchangés.
- Démo explicitement signalée : petit-déjeuner Villa Mare, trois personnes, choix d’option/créneau, demande, commande dans le gestionnaire de démo, confirmation puis bouton de **simulation** de paiement. Aucun appel à une route réelle de réservation/paiement dans ce scénario. Les commandes de démo restent dans la mémoire du navigateur ; elles ne sont pas des commandes Supabase ni des transactions Stripe.

## Mascotte et DA

Aucun asset officiel de mascotte n’est présent dans le dépôt. Le bouton affiche donc « Nona », sans personnage inventé. `public/nona/` et `src/lib/nona-assets.ts` réservent les chemins du portrait et de l’animation officielle. Le coucou utilise l’asset fourni pendant deux secondes, sauf préférence système de réduction des animations. Ce comportement d’asset ne peut pas être validé visuellement tant que les fichiers manquent.

Le panneau est une intégration fonctionnelle responsive utilisant les styles existants. Aucune refonte du guide, de la grille ou de la DA globale. La DA définitive peut maintenant être transmise.

## Fournisseur et coût IA

**Aucun fournisseur IA connecté ou appelé.** Le mode public indique « Assistant guidé · IA non connectée » ; la démo indique également son caractère simulé. Aucune dépendance SDK ou clé payante ajoutée. Coût modèle observé : **0 €**, zéro appel ; aucun supplément d’offre ajouté.

L’endpoint serveur `/api/public/concierge` accepte uniquement un slug, une langue, un message, un historique utilisateur borné et des paramètres de sélection. Il recharge le livret par le RPC public ; il n’accepte ni guide client, ni jeton de commande, ni prix ou état imposé. Le schéma de proposition pour un futur fournisseur ne permet que des identifiants et paramètres vérifiables, jamais une action de paiement ou de création de commande. La signature des photos réutilise le signataire du livret avec son contrôle de propriété.

Les messages et corps de réponses ne sont pas journalisés par le nouvel endpoint. Plafonds : 1 200 caractères par message, six messages d’historique transmis, douze messages affichés, corps 12 Kio, vingt requêtes/minute par empreinte et par isolate, table de limitation bornée à 4 096 entrées. Cette limitation en mémoire **n’est pas un quota distribué**. Le plafond facturable actuel est zéro puisque aucun adaptateur modèle ne peut être activé dans cette version.

Avant IA réelle : autorisation du fournisseur/modèle textuel économique et de son budget ; implémentation de l’adaptateur serveur et d’une comptabilité/quota durable par organisation, plafonds de coût, validation des sorties et tests d’injection. La simple présence d’une clé ne doit pas activer de dépense. Ces étapes restent nécessaires ; cette version n’est pas annoncée comme une IA opérationnelle en production.

## Validations ciblées

- **26 tests / 7 fichiers** : 17 nouveaux (six langues, mémoire des paramètres, inconnues, données/modèle non fiables, devis et créneaux, endpoint public/limites, confirmation contrôlée, double soumission, statut local falsifié) et 9 contrôles existants directement touchés (Services/formulaire/Villa Mare/gestionnaire de démo). Aucune suite financière Stripe/Billing, RLS ou offline rejouée.
- TypeScript et build client/serveur réussis ; lint zéro erreur, seize avertissements préexistants.
- Navigateur Chromium local : scénario complet à **360×844, 390×844 et 1280×844** ; pas d’erreur JavaScript ni débordement horizontal. « Oui » crée zéro demande, le double clic en crée une, la confirmation dans l’UI gestionnaire rend la simulation payable, le retour au chat préserve sa progression. Zéro requête de mutation réseau depuis la démo.
- Sonde réelle du nouvel endpoint local raccordé uniquement à Supabase TEST `mhhtnqfdkyudwyqlmnce` : HTTP 200, mode `guided`, un extrait publié, `Cache-Control: no-store`, zéro appel/coût modèle. Il s’agit d’une lecture du guide TEST existant, pas d’une mutation, d’une migration ou d’un paiement.
- Script reproductible : `scripts/e2e/nona-concierge.mjs`, réservé à `/demo` sur loopback HTTP. Module Playwright fourni par `NONA_PLAYWRIGHT_MODULE`, largeur et répertoire de résultats en arguments. Aucune installation de navigateur dans les dépendances de production.

Preuves anonymisées : `docs/evidence/nona-concierge-20261015.json`.

## Ce qui reste humain ou externe

1. Fournir les assets officiels et la DA définitive.
2. Autoriser le fournisseur/modèle et le budget IA avant tout branchement facturable.
3. Pour la preuve Stripe TEST complète déjà demandée : rendre disponible la clé TEST existante dans le secret privé `NONA_TEST_STRIPE_SECRET_KEY` de NONA-OPS. Le connecteur Stripe est confirmé en TEST et un compte de recette existant actif a été identifié, mais ce chantier conversationnel n’exécute ni ne revendique un nouveau paiement Stripe. Aucun ancien compte gestionnaire n’a été remplacé.

Le guide public avec le nouveau chat n’est pas déployé en production. Les droits de publication, la migration commerciale et le Live restent des autorisations distinctes. Aucun achat, crédit génératif Lovable, appel modèle facturable, merge main, suppression de données ou changement du moteur financier effectué.
