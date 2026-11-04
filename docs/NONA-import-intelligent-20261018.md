# NONA — Import intelligent et PMS, état du 18 octobre 2026

## Résultat et limites de validation

La copie locale propose trois entrées : coller un lien, connecter un logiciel, coller du texte. Les résultats passent par une revue puis par la création d'un brouillon. Aucune publication automatique n'a été ajoutée.

L'extraction réseau a été réellement exécutée sur sept pages publiques. Les tests de composants et de contrats PMS sont des tests synthétiques distincts. Aucun compte PMS client n'était accessible. Aucun navigateur n'était exposé à l'automatisation : le parcours authentifié complet, les captures responsive et le rendu final d'un logement réellement importé ne sont donc pas validés.

**Cette livraison ne constitue pas une validation complète de la bêta.** Elle fournit du code testable localement et des preuves séparant extraction, modèle local, composants, HTTP et accès externes.

## Préservation du travail existant

- Travail limité à `output/nona-lovable-sync`, branche locale `work/nona-smart-import-20261018`, à partir de `f6c51c2a83c89dc3d440d188a6dd844597fb7123`.
- Le dépôt d'origine dans Documents et ses éventuelles modifications non publiées n'ont pas été modifiés.
- Le checkpoint local antérieur contient les fichiers récupérés de Lovable jusqu'à la révision `7c8f52d06f54792498a02b766ae13fc683cb60a5`. Son ascendance Git n'est pas identique à celle de la branche distante : aucune poussée ni réécriture de l'historique distant n'a été faite.
- Aucun usage du connecteur Lovable, crédit Lovable, appel IA externe payant, paiement, changement de fournisseur du concierge, migration de base ou déploiement en production.
- Moteur Services, réservations, pricing, Stripe Connect et commission de 2 % conservés. Les tests existants de ces parcours restent dans la suite de régression.

## Chaîne d'extraction

1. Les URL utilisent les protections existantes : résolution publique contrôlée, limites de taille, robots.txt, contrôle des redirections, refus des accès privés et des challenges. Aucun CAPTCHA résolu ou contourné.
2. HTML lu avec parse5, sans exécuter les scripts. Paragraphes longs conservés ; scripts, formulaires, navigation et blocs d'avis identifiables écartés.
3. Sunver public : lecture bornée de l'établissement correspondant au slug, des FAQ et des modules publics présents dans le document. Le parseur React Flight respecte les blocs texte de longueur UTF-8, même multilignes. Les traductions d'interface, comptes, tokens et configurations ne sont pas récoltés. Aucune API privée appelée. Les recommandations restent séparées de l'adresse et du contact du logement.
4. Texte : jusqu'à 200 000 caractères, sans échantillonnage silencieux. Règles multilingues, titres de sections, conservation des preuves et signalement des contradictions d'horaires ou de Wi-Fi. Les autres différences de sources restent à vérifier ; la détection sémantique de toute contradiction possible n'est pas garantie.
5. Assistance optionnelle par le modèle local existant Qwen3.5 9B, à l'adresse de boucle locale fixe. Vérification préalable du nom et du digest du modèle. Inférence CPU vérifiée ; paramètres du concierge inchangés. Les propositions ne sont acceptées que si la clé existe et si la citation est présente mot pour mot dans le texte. Les propositions IA restent à vérifier.
6. Une seule analyse IA à la fois par processus applicatif, délai total borné à 180 secondes. Échec, saturation, troncature ou traitement partiel : avertissement explicite et conservation du résultat documentaire complet. Aucun repli vers une API payante. Les documents longs peuvent dépasser ce budget CPU : ce n'est pas présenté comme une compréhension IA exhaustive.
7. Revue : nom modifiable, trouvé/à vérifier/manquant, preuves et confiance indicative visibles, correction manuelle prioritaire. Bouton de confirmation sans ressaisie pour une valeur non contradictoire. Une contradiction exige une correction avant confirmation. Création de brouillon uniquement.

Les scores sont indicatifs, pas des probabilités calibrées. Les preuves sont conservées dans les champs existants de provenance et de texte brut ; aucune nouvelle table n'a été créée.

## Photos et fichiers

- Jusqu'à 30 photos candidates issues des métadonnées du logement ou du contenu public Sunver autorisé ; les images arbitraires de la page ne sont pas aspirées.
- Les droits ne sont pas inférés : ils restent inconnus jusqu'à confirmation du gestionnaire. La copie serveur existante conserve ses contrôles de source, stockage privé, taille et type.
- Import de fichiers TXT, Markdown et HTML : maximum 1 Mo et 200 000 caractères après lecture. HTML analysé comme données.
- PDF, Word, OCR et scans ne sont pas intégrés dans ce lot ; leur texte peut être collé. Aucun résultat de lecture PDF n'est annoncé.
- Le parcours PMS initial ne copie pas les photos : limite affichée à l'utilisateur.

## Résultats réseau réels

Les nombres désignent des rubriques non vides, pas des rubriques toutes exactes ou approuvées. Les champs web restent à vérifier. Aucun logement tiers de ces essais n'a été enregistré dans une base ni publié.

| Plateforme / source                      | Résultat mesuré                                  | Statut honnête                                                                       |
| ---------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Sunver, Villa Dolce Vecchia              | 10 rubriques, 1 photo candidate                  | Extraction fonctionnelle et testée ; validation éditeur non effectuée                |
| Sunver, Casa Oliviera — Ajaccio          | 12 rubriques, 1 photo candidate                  | Extraction fonctionnelle et testée ; contenu dynamique absent possible               |
| Airbnb, Votre petit cocon charentais     | 13 rubriques, 9 photos candidates                | Extraction fonctionnelle sur cette annonce ; pas de garantie sur toutes les annonces |
| Booking, Best Western Champlain          | Challenge anti-robot reconnu, résultat `blocked` | Extraction URL bloquée ; voie texte disponible                                       |
| Hôtel Champlain, page française          | 12 rubriques, 6 photos candidates                | Extraction testée, à relire                                                          |
| Hôtel Champlain, informations en anglais | 10 rubriques, 6 photos candidates                | Extraction multilingue testée, à relire                                              |
| Le Manoir La Rochelle, chambres          | 14 rubriques, 1 photo candidate                  | Extraction testée ; page portant sur plusieurs chambres à relire                     |

URL exactes, dates, durées et inventaire de champs sans données opérationnelles sensibles : [preuve réseau](validation/nona-import-real-20261018.json).

## PMS : audit et état par fournisseur

| Fournisseur | Accès officiel à obtenir                                                              | Implémentation et données de ce lot                                                                           | Validation / synchronisation                                                                           |
| ----------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Guesty      | Accès client Open API, client ID/secret, clé de chiffrement serveur                   | Connecteur existant réutilisé : connexion, pagination, normalisation et brouillons                            | Aucun compte réel connecté dans ce lot ; synchronisation continue non validée                          |
| Lodgify     | Clé API client avec accès autorisé                                                    | Adaptateur de session GET liste/détail : identifiant, nom, description/adresse selon réponse                  | Contrats synthétiques ; schéma réel à confirmer avec compte client                                     |
| Hostaway    | Jeton bearer client existant ; obtention et renouvellement hors adaptateur de session | Liste/détail avec ressources ; identifiant, nom, description/adresse, horaires textuels et règles disponibles | Contrats synthétiques ; horaires numériques et champs avancés restent à compléter sur réponses réelles |
| Smoobu      | Clé et secret HMAC ; OAuth multi-clients nécessite le parcours partenaire             | Liste/détail en lecture, signature HMAC, normalisation de localisation                                        | Contrats synthétiques ; pas d'annonce de connexion réelle                                              |
| Beds24      | Jeton existant limité à la lecture des propriétés ; échange d'invitation non ajouté   | Liste/détail et pagination préparés, identité et champs génériques disponibles                                | Contrats synthétiques ; permissions et réponse réelles à valider                                       |
| Amenitiz    | Accès API du compte, plan/activation et client ID/secret à confirmer                  | Entrée explicite de préparation ; aucun adaptateur annoncé comme connecté                                     | Bloqué par accès et contrat externe                                                                    |
| Cloudbeds   | Accès propriété ou application partenaire, scopes et certification selon usage        | Entrée explicite de préparation                                                                               | Bloqué par accès et contrat externe                                                                    |
| Mews        | ClientToken d'intégration et AccessToken de l'établissement, accès de test/partenaire | Entrée explicite de préparation                                                                               | Bloqué par accès et contrat externe                                                                    |

Pour les quatre adaptateurs de session ajoutés : origines HTTPS fixes, GET uniquement, aucune redirection, réponses bornées, authentification NONA et rôle propriétaire/admin requis. Les secrets restent en mémoire de session ; ils ne sont ni placés dans les URL, ni enregistrés, ni intégrés au brouillon. Ce parcours ne constitue pas une connexion persistante.

Documentation officielle consultée : [Guesty](https://open-api-docs.guesty.com/docs/authentication), [Lodgify](https://docs.lodgify.com/reference), [Hostaway](https://api.hostaway.com/documentation), [Smoobu](https://docs.smoobu.com/), [Beds24](https://wiki.beds24.com/index.php/Category%3AAPI_V2), [Amenitiz](https://support.amenitiz.com/en/articles/805686-how-to-understand-the-amenitiz-api), [Cloudbeds](https://developers.cloudbeds.com/docs/getting-started-as-a-partner-in-5-steps), [Mews](https://docs.mews.com/connector-api/getting-started).

## Doublons et réimport

- Une même source URL déjà présente dans l'organisation rouvre le logement sans modifier ses données. Les corrections manuelles et le guide existant sont conservés.
- Identifiant stable limité à l'organisation pour éviter deux créations concurrentes de la même source. Une collision concurrente peut encore produire une erreur à réessayer ; elle ne crée pas un second logement.
- Identité PMS fondée sur fournisseur + identifiant externe.
- Des propositions de fusion protégeant les champs manuels sont préparées et testées ; leur interface d'acceptation et une synchronisation continue ne sont pas reliées. Le réimport actuel ne complète pas automatiquement les nouveaux champs.
- Variantes d'URL non normalisées et changements d'identifiants externes nécessitent une validation supplémentaire. L'import multiple existe côté Guesty ; la nouvelle session PMS permet un logement à la fois.

## Contrôles réalisés

- Vitest : **478 tests réussis**, 2 ignorés, aucun échec.
- Tests Node : **19 réussis**, 1 ignoré, aucun échec. Le test de protection du laboratoire en boucle locale passe désormais.
- Total : **497 tests réussis**, 3 ignorés. Inclut les régressions existantes et les nouveaux cas d'import.
- TypeScript, ESLint, compilation Vite : réussis.
- Vérification SSR de la compilation : HTTP 200, image prioritaire et trois polices WOFF2 hors ligne vérifiées.
- Inventaire des migrations : 26, inchangé. Aucune migration appliquée.
- Nouveau test de composant : confirmation d'un champ sans ressaisie, preuves conservées, contradiction non confirmable directement, aucune publication déclenchée. C'est un test DOM simulé, pas un essai navigateur.
- Modèle réel : texte synthétique mal structuré, classement attesté dans [preuve IA locale](validation/nona-local-import-20261018.json). Les documents long et contradictoire sont distingués des vrais essais réseau dans leur fichier de preuve.
- Galerie volumineuse, document dépassant la limite, texte long avec correction tardive, titres multilingues, citations inventées refusées, modèle non conforme refusé, réimport préservant le manuel, parseur HTML/Flight : tests synthétiques.
- Prévisualisation : [preuves HTTP](validation/nona-preview-http-20261018.json). Réponse HTTP ne prouve ni hydratation, ni connexion, ni parcours de publication.

## Prévisualisation locale et éléments restant à obtenir

### Mesures documentaires avec le véritable modèle local

- Texte mal structuré de 202 caractères : 13,9 secondes, cinq rubriques, classement IA sans avertissement.
- Texte multilingue contradictoire de 208 caractères : 26,5 secondes, cinq rubriques, contradiction Wi-Fi et seconde valeur conservées.
- Livret synthétique de 34 060 caractères : 180 secondes, assistance IA partielle explicitement signalée ; extraction documentaire complète, horaires tardifs et seconde valeur Wi-Fi conservés. L'objectif d'une compréhension IA rapide et exhaustive de gros livrets n'est donc pas atteint sur cette configuration CPU.

Ces documents sont synthétiques, mais les appels Qwen sont réels. [Mesures détaillées](validation/nona-document-scenarios-20261018.json).

Serveur local sur `http://127.0.0.1:4184`. Entrée réelle : `/app/new`, connexion gestionnaire requise. Démo isolée sans compte : `/demo?preview=manager`. Guide de démonstration : `/guide-preview?device=mobile`. La démo n'exerce pas les vrais comptes PMS.

L'assistance locale dépend du processus Qwen existant sur le PC et de son activation pour le serveur local. Elle ne sera pas accessible depuis une future application hébergée sans architecture distincte et autorisation. Aucun fournisseur externe n'a été ajouté.

Restent nécessaires avant une validation bêta complète : navigateur accessible pour le parcours authentifié, contrôle visuel à 360/390/430 px et desktop, validation de l'import puis du guide, comptes et autorisations PMS, tests de contrats réels et de réimport en base. La revue de chaque API nécessitant un partenariat est regroupée ci-dessus. Les nouvelles pages PMS contiennent encore de la copie française à internationaliser.

## Principaux fichiers modifiés

- Extraction : `document-extractor.ts`, `flight-records.ts`, `html-document.ts`, `intelligence.server.ts`, `text-import.functions.ts`, `url-source.server.ts`, `url-import.functions.ts`, `photo-candidates.ts`, `types.ts`, `import-identity.ts`.
- Données et PMS : `data/properties.ts`, `integrations/providers/model.ts`, `pms-session.server.ts`, `pms-session.functions.ts`, `integrations/pms-readiness.ts`.
- Interface : `ImportReview.tsx`, `ManagerScreens.tsx`, `DemoManager.tsx`, `app.new.tsx`, `app.import-text.tsx`, nouvelle route `app.import-pms.tsx`, `import-copy.ts`, arbre de routes généré.
- Tests et preuves : tests d'extraction, contrats PMS, galerie et revue ; JSON de validation sous `docs/validation`.
- Dépendance parse5 déclarée directement, déjà présente dans les dépendances transitives installées. Aucun remplacement de framework.
