# NONA — autorisation reçue et aperçu TEST préparé

Ce bilan remplace les obstacles d'accès décrits dans `nona-hosted-test-20261020.md`, sans remplacer les preuves historiques.

## Avancées vérifiées

L'utilisateur a explicitement autorisé la fenêtre proposée de quinze minutes, jusqu'à vingt générations maximum, exclusivement sur crédits Free revérifiés et sans nouvelle dépense. La fenêtre n'a pas été ouverte : l'autorisation SQL est toujours désactivée et expirée. Aucun renouvellement implicite ni appel IA n'a été effectué.

L'inspection Vercel a réussi en utilisant l'identifiant exact du projet sans le paramètre d'équipe qui produisait le refus. Un projet **distinct** `nona-concierge-test-20261020`, identifiant `prj_JNddG5i5NkQyvQI83Blh7X02GVzV`, est créé dans l'équipe existante. Aucune connexion Git, domaine, déploiement, mise en production ou souscription n'a été ajouté. Contrôle final : `live=false`, `latestDeployment=null`, aucun domaine. La protection SSO par défaut est conservée.

Compte Ollama authentifié revérifié : offre Free ; solde acheté 0 USD ; recharge automatique Off ; consommation Free affichée 0,4 % ; Gemma 4 31B figure parmi les modèles éligibles ; 48 appels Gemma et un appel GPT historiques. Aucun fonds ni moyen de paiement ajouté.

## Paquet concret

Commande de préparation : `node scripts/validation/build-nona-hosted-test.mjs`.

Le paquet indépendant `.output/hosted-test-deploy` contient :

- Le renderer du guide et la mascotte, avec copie de lecture des changements UX non publiés (`GuideView`, `GuideContent`, `i18n`, `ux-copy`, feuille DA). Le frontend cloud conserve son chat existant ; aucun fichier d'origine UX n'est modifié. Le libellé de transport de laboratoire devient « TEST cloud » dans ce paquet seulement.
- Le backend partagé compilé, adaptateur Ollama direct et validateur métier existants, dépendances regroupées pour Node. La route TEST est compilée sans le chargeur Gateway, pour empêcher tout routage payant de secours.
- Un point d'entrée serveur GET du guide synthétique et POST du chat. Aucune route de commande, paiement, Stripe, import, gestionnaire ou données clients.
- Requêtes bornées à 12 288 octets réellement lus, validation du slug, rejet des origines étrangères et refus du runtime production. Prix et disponibilité ne proviennent jamais de la prose du modèle.
- Assets existants et configuration Vercel d'aperçu ; aucune clé dans le code. Les secrets ne sont pas des variables publiques de compilation.

Le catalogue utilisé reste **Villa Mare fictif**, comme dans les recettes précédentes, avec le devis serveur 75 EUR pour trois personnes. Le guide d'audit publié dans la base TEST contient en réalité un autre service fictif à prix fixe 15 EUR : il n'a pas été remplacé ni modifié pour produire artificiellement 75 EUR. Le laboratoire utilise explicitement son propre catalogue serveur synthétique, associé à une propriété TEST autorisée pour la comptabilisation. Ceci ne constitue pas encore la validation d'un guide client publié avec ses services réels.

Compilation serveur + UI : réussie. TypeScript : réussi. Lint ciblé : réussi après remplacement d'un type `any` dans le nouveau test. **Suite Vitest complète : 613 réussis, deux ignorés ; 97 fichiers réussis et un ignoré.** Quatre nouveaux tests vérifient : source synthétique sans réseau ; refus production/cross-site ; absence de routes paiement/commande et rejet des requêtes invalides ; progression guidée jusqu'au récapitulatif serveur de 75 EUR sans soumission. Leurs réponses sont **guidées**, pas des générations réelles. Les suites natives Node et Playwright du checkpoint antérieur ne sont pas prétendues réexécutées ici.

## Blocage d'autorisation explicite

La revue automatique d'autorisation a rejeté la création des variables serveur Vercel contenant la **clé API Ollama existante et la clé Supabase `service_role` du projet TEST**. Motif fourni : leur transfert vers Vercel exige un accord explicite pour cette destination ; les déclarer chiffrées ou sensibles ne remplace pas cet accord.

Aucun contournement de ce rejet par un autre hébergeur, un fichier source, un runner ou un proxy n'est autorisé. Ces clés ne doivent jamais être copiées dans GitHub Actions. La clé `service_role` est privilégiée dans TEST ; même exclusivement côté serveur, son transfert constitue une délégation d'accès à cet hébergeur. La proposition est de les stocker seulement dans les variables serveur de l'environnement **Preview** du **nouveau projet TEST isolé**, sans accès de production, sans variable frontend et sans impression des valeurs.

Le projet reste sans déploiement. Aucun lien de vraie IA ni capture cloud navigateur n'est donc annoncé. Une tentative de transfert du paquet de sources vers l'outil de déploiement a également rencontré une fermeture du transport de l'environnement d'exécution ; aucun déploiement n'a été soumis. Le paquet compilé reste disponible localement, sans secret incorporé.

## État des limites

Vérification Supabase finale : `enabled=false`, expiration historique inchangée, réserve 980 000 micro-EUR sur plafond cumulatif 4 000 000 ; politique mensuelle désactivée ; 49 tentatives et 49 observations. La réserve n'est pas la consommation facturée.

La propriété d'audit courante a déjà 27 tentatives ce jour et sa limite est de 30/jour. Vingt est un maximum autorisé pour la nouvelle recette, pas une garantie que les quotas existants l'admettront : sans autre fixture TEST autorisée ou renouvellement naturel du jour, cette propriété n'en admettrait que trois. Aucun quota n'a été relevé, aucun compteur remis à zéro.

Nouvelle consommation IA : **zéro** ; nouvelle dépense : **zéro**. Pas de nouveau résultat comparatif Haiku. La bêta privée, les six langues et les conversations longues depuis un navigateur avec IA réelle restent à vérifier après résolution du transfert des clés et déploiement de l'aperçu. Aucun Lovable, aucun paiement, aucune production modifiée.
