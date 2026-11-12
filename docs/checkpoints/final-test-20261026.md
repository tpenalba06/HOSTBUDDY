# NONA — checkpoint vérifié du 26 octobre 2026

## Décision

- Déploiement TEST du guide isolé : VALIDÉ dans ce périmètre. L'application gestionnaire complète n'est pas déployée par ce paquet.
- Gemma Cloud : accès Free et 10 appels réels VALIDÉS ; validation finale de qualité BLOQUÉE. Les correctifs issus de cette recette passent les tests locaux mais n'ont pas reçu une nouvelle recette fournisseur après fermeture de la fenêtre.
- Bêta privée : NON OUVERTE. Aucun destinataire externe autorisé n'a été fourni ; le parcours gestionnaire authentifié complet n'a pas été validé sur ce déploiement.

## Déploiements et sauvegarde

- Projet `prj_JNddG5i5NkQyvQI83Blh7X02GVzV`, équipe `team_7ootXJgYQeic3jxHpiRxpXN2`.
- Déploiement final `dpl_3KaXnWLuzyNjZjyqT9W2qm7S5T5E` : READY, staging, projet live=false, protection SSO activée.
- URL finale : https://nona-concierge-test-20261020-2ooqkno6f.vercel.app/
- Recette réelle, avant correctif : `dpl_EwKN3FWcFU3tD7xkmvj2Whws3DvW`, https://nona-concierge-test-20261020-9k085ofis.vercel.app/
- Ancien checkpoint retrouvé : `a90b2c3ca286e3614168c831596564fb4bb6b6ea`, puis `7d92ae7`. Le bundle consolidé du 22 octobre contient un historique complet et six références ; vérification Git réussie.
- Paquet final : `output/nona-final-20261025/package` depuis la racine du projet HOSTBUDDY. 58 fichiers. Seul le serveur compilé change ; `api/preflight.mjs` est retiré. Les 57 autres fichiers sont repris sans modification depuis le manifeste précédent, sans nouvel envoi.
- SHA1 du serveur final : `a4ba5f2157ad740eaea02b0c931a6bf212422a50`. Vercel référence cette même empreinte. 45 fichiers visibles correspondent au manifeste ; les 13 fichiers du sous-dossier de polices sont tronqués dans la réponse du connecteur. Ne pas présenter cela comme une relecture octet par octet de tous les fichiers distants.
- Code, preuves et historique complet sont conservés dans le nouveau commit/bundle final, dont l'identité est consignée dans le reçu externe du checkpoint. Aucun push Git, aucune utilisation du connecteur Lovable ni de ses crédits.

## Preuve Ollama authentifiée

Lecture réelle du compte et du diagnostic serveur, sans génération lors du précontrôle : Free, `gemma4:31b` dans les modèles éligibles, auto-reload Off, aucune facture, crédits achetés 0 USD. Solde inclus avant recette : 2.4858 USD sur 2.5 USD. Après recette : 2.48299 USD. Débit authentifié des crédits inclus : **0.00281 USD** ; aucun nouveau paiement effectué. Le compte passe de 62 à 72 requêtes Gemma (une ancienne requête gpt-oss reste distincte).

Le débit de crédits inclus n'est pas un paiement en dollars, ni une preuve de gratuité perpétuelle. Les réglages observés ne sont valables qu'au moment de leur contrôle. Les captures et textes anonymisés figurent dans `docs/evidence/final-20261026`.

## Autorisation et consommation TEST

- Supabase TEST uniquement : `mhhtnqfdkyudwyqlmnce`.
- Fenêtre bornée préparée pour 20 nouveaux appels maximum : réserve initiale 1260000 + 20 × 20000 = plafond cumulatif 1660000 micro-EUR. Aucun compteur remis à zéro.
- Fenêtre limitée à 15 minutes ; fermeture explicite après **10 appels réels**, pas de retry fournisseur automatique. Le quota existant de 10 réservations par empreinte sur cinq minutes reste inchangé.
- État final distant : enabled=false, expires_at=2026-10-25T18:04:40.506Z, reserved_micros=1460000, cap_micros=1660000 ; 73 réservations et 73 observations cumulées.
- Politique mensuelle 20000000 micro-EUR : toujours désactivée. Variable privée Preview `NONA_OLLAMA_TEST_ENABLE` remplacée par `closed-after-recipe` avant le déploiement final.
- Réservation SQL après fermeture : false. Message navigateur après fermeture : guided, modelCalls=0. Même constat sur le déploiement final.
- Sur les dix appels : 23474 tokens d'entrée, 838 tokens de sortie ; estimation tarifaire instrumentée 0.0027518 USD, distincte du débit authentifié 0.00281 USD.
- Latence fournisseur instrumentée : 585–809 ms. Les mesures navigateur enregistrées des tours IA sont généralement de l'ordre de 2 secondes ; ce temps inclut interface/réseau/observation et n'est pas une mesure réseau pure.
- 9 propositions acceptées en mode ai, 1 remplacée par le repli guidé après un appel réel. Taux d'acceptation technique 90 %, qui ne mesure pas à lui seul la qualité.

## Recette réelle et qualité

- FR : conversation libre chaleureuse avec tutoiement, massage implicite puis explicite, changement de sujet, cartes Wi-Fi/arrivée serveur.
- EN, ES, DE, IT, PT : réponses réellement générées et affichées depuis le chat protégé. Le social allemand a été accepté sur cet échantillon.
- Code boîte à clés demandé directement et allergènes : réponses guidées sans appel modèle, aucune garantie d'allergène, aucun code inventé ni fausse urgence. La carte d'arrivée de cette fixture contient un code synthétique ; cela ne constitue pas un test d'un guide dont le code source est réellement absent.
- Conversation prolongée sur plusieurs sujets et langues : contexte fournisseur borné, maximum observé 2484 tokens d'entrée ; aucun test de charge ou contexte maximal n'est revendiqué.
- Petit-déjeuner fictif pour trois personnes : brouillon serveur 7500 centimes, créneau réellement proposé et option Classique. Contrôlé sur desktop pendant la recette et sur mobile 390×844 sur le déploiement final, sans appel IA. Aucun nom/contact saisi, aucune confirmation, réservation réelle ni paiement.
- Défauts constatés : le modèle a relié un massage à la piscine sans source de service établissant ce lieu ; une réponse PT contenait « Seriously ». Ils ont été acceptés par l'ancien validateur.
- Correctif ciblé : refus des formulations de localisation observées dans les six langues et de l'insertion anglaise observée hors EN. La réponse revient alors au moteur guidé existant. Sept cas de non-régression ajoutés. Aucun changement du moteur métier, du rendu client, de la DA ou de la mascotte. Ces gardes lexicaux ne prouvent pas l'absence de toute hallucination.
- Pas de nouvelle génération après ces correctifs : fenêtre fermée et revue expirée. Ne pas déclarer la qualité Gemma finale validée.

## Vérifications

- 27 migrations : inventaire et empreintes vérifiés. Les fins de ligne Windows du checkout étaient la cause des premiers échecs ; retour aux octets LF du dépôt et ajout de `.gitattributes`. Aucun SQL historique modifié.
- Vitest : 100 fichiers réussis, 1 ignoré ; 665 tests réussis, 2 ignorés.
- Node : 19 tests réussis, 1 ignoré, zéro échec après autorisation du serveur local de test. L'échec initial EACCES sur 127.0.0.1 était lié au bac à sable.
- Lint : zéro erreur, 23 avertissements existants. TypeScript : réussi. Build complet : réussi. Smoke SSR compilé : HTTP 200, polices WOFF2 et priorité image vérifiées.
- Construction du paquet TEST final et contrôles locaux : guide/chat 200 en mode guidé, origine étrangère 403, commande HTTP 405, production 403, zéro tentative réseau dans ces contrôles.
- Comparaison en mémoire des deux identifiants privés disponibles dans le coffre avec les 54 fichiers frontend : zéro fuite. Aucun secret affiché ou ajouté au dépôt.
- Supabase réel : isolation organisations/rôles/stockage, catalogue et devis serveur/idempotence/reçu privé passent sur fixtures annulées. Contrainte de commission 2 % vérifiée sur montant fictif 1500 centimes / commission 30 centimes ; rejet d'une commission invalide, puis ROLLBACK. Aucune requête Stripe émise par ces vérifications.
- La recette complète de file de synchronisation comptable distante a rencontré deux erreurs `Invalid or expired requestState` ; elle n'est pas comptée comme réussie. Le contrôle ciblé de commission a ensuite réussi. Les tests locaux de synchronisation/paiement ont réussi.
- Les outils Vercel de lecture d'arbre/projet/déploiement fonctionnent. Les événements de build et le fetch protégé via connecteur répondent encore 403. Le navigateur authentifié a permis les contrôles réels sans changer SSO. L'accès anonyme HTTP n'a pas pu être mesuré par l'outil web ; la configuration SSO a été vérifiée via l'API.
- Les avis de sécurité Supabase incluent des fonctions SECURITY DEFINER exposées et la protection contre mots de passe divulgués désactivée. Aucun changement global de privilèges effectué sur la seule base du linter. Les tests d'isolation passent ; ces avis ne sont pas présentés comme tous résolus.

## Conditions restantes avant bêta

1. Revalider la qualité du fournisseur après correctif avec une nouvelle preuve de gratuité et une fenêtre explicitement autorisée ; ne pas réutiliser la revue expirée ni activer la politique mensuelle.
2. Valider le parcours gestionnaire authentifié complet et les logements/services TEST sur son hébergement. Les comptes et logements existants ne prouvent pas leur utilisation de bout en bout : agrégats TEST observés, 17 utilisateurs, 13 appartenances owner, 17 logements publiés, 3 services actifs.
3. Obtenir les destinataires autorisés avant toute invitation externe. Aucun destinataire inventé, aucune invitation envoyée. Aucune approbation de dépense récurrente sollicitée ou supposée.

Production, Stripe Live, achats, cartes, abonnement, auto-recharge et facturation continue restent hors du travail effectué.
