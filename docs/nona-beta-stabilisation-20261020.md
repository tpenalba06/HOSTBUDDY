# NONA — stabilisation avant bêta privée

État : **pas encore prête pour ouverture de la bêta IA permanente**. Les corrections et protections sont implémentées et éprouvées hors inférence ; leur effet sur les trois incidents Gemma doit encore être mesuré par une nouvelle recette cloud autorisée. La précédente fenêtre de quinze minutes n'a pas été renouvelée. Aucun nouvel appel IA ni paiement pendant cette reprise.

## Corrections concrètes

- Une conversation ou suggestion avec `questionFor=none` ne réactive plus un ancien récapitulatif : les cartes de services restent vérifiées, les modifications de brouillon proposées dans cette suggestion sont ignorées. Le brouillon précédent reste mémorisé.
- Un devis n'est retourné que pendant une étape de réservation `ready`. Une question Wi-Fi ou un sujet inconnu ne récupère plus le devis du service précédent.
- Passage petit-déjeuner → massage : les champs explicitement répétés sont conservés même s'ils sont identiques à l'ancien brouillon. Le test a notamment révélé et corrigé la perte de « demain ». L'heure et la formule du petit-déjeuner ne sont pas héritées automatiquement.
- Le contexte donne au modèle un indice de réservation calculé par le validateur serveur. Les consignes distinguent explicitement conversation sociale, anniversaire en allemand, suggestion et réservation. La question d'heure doit être explicite ; les protections de langue, de prix, de confirmation et de source restent actives.
- Conversation longue : suppression de l'historique dupliqué et réduction des échanges les plus anciens jusqu'au budget de douze mille octets, sans supprimer le message actuel, les sources ou les brouillons. Pas de mémoire illimitée : dix messages structurés au maximum dans la requête.
- Confidentialité : les secrets connus des traductions du guide sont aussi masqués lorsqu'ils sont répétés par le voyageur. Les corps du livret, contacts, codes d'accès et mots de passe ne deviennent pas des sources de génération. La détection de texte personnel arbitraire reste imparfaite ; les premiers essais privés doivent utiliser des données fictives.
- Diagnostic serveur à motifs autorisés : admission, fournisseur, schéma, source, cohérence ou réponse acceptée. Aucun texte voyageur, réponse rejetée, clé ou erreur brute du fournisseur n'est enregistré. Les trois réponses rejetées de la recette précédente n'avaient pas été conservées : aucune cause précise n'est inventée rétrospectivement.
- Mesure Ollama séparée de la validité du tool call : des tokens valides restent comptés quand la proposition est mal formée ou tronquée. Usage réellement manquant ou modèle inattendu : état incertain et réserve intégralement retenue. Aucun retry.

## Fonctionnement mensuel préparé, non activé

La voie Gemma utilise désormais le même transport direct que le TEST et les RPC mensuelles atomiques existantes. Elle reste limitée au projet Supabase TEST, refuse un runtime production et exige une liste serveur de couples logement/slug pour la bêta. Les empreintes voyageur et réseau sont signées côté serveur ; la conversation est liée au logement. L'organisation et les quotas restent déterminés en base.

Son activation requiert simultanément une configuration explicite, une autorisation mensuelle non expirée en base et une revue indépendante de confidentialité/conditions et de financement. Le schéma exige une preuve d'arrêt strict sur crédit prépayé, sans débit différé ni recharge automatique ; **une simple alerte fournisseur est insuffisante**. Ce mode de financement n'est pas établi pour le compte Ollama actuel : aucune attestation n'a été fabriquée et aucun crédit n'a été acheté. Une ancienne revue Free de quinze minutes ne peut pas ouvrir cette voie.

Le plafond configurable est préparé jusqu'à vingt euros. **Il reste désactivé.** Réserve conservatrice de deux centimes avant chaque tentative, contrôlée sous verrou en base ; ni erreur ni estimation de détail ne libère cette réserve. Avec vingt euros, mille tentatives au maximum sans rapprochement financier vérifié, même si leur coût réel serait inférieur. Ce mécanisme privilégie le blocage sûr et peut donc couper bien avant vingt euros réellement consommés.

La vérification SQL réelle en lecture seule confirme : TEST fermé, mensuel désactivé, 63 tentatives et 63 observations cumulées ; réserve TEST 1 260 000 sur 1 380 000 micro-euros. Les rôles `anon` et `authenticated` ne peuvent pas exécuter la réservation mensuelle ; `anon` ne peut pas lire les observations. Preuve : `evidence/nona-beta-closed-20261020.json`.

## Vérifications

Local : **647 tests Vitest réussis, deux ignorés**. Le runner Linux exécute aussi **19 tests natifs Node réussis et un ignoré**, soit 666 réussis et trois ignorés au total, sans compter les étapes navigateur comme des tests unitaires. TypeScript passe ; lint global sans erreur, avec les 23 avertissements Fast Refresh existants. Le paquet hébergé TEST compile sans charger le wrapper d'hébergement interdit et conserve les surcharges UX non publiées. Les patchs suivis et les sept fichiers non suivis du second checkout ont été comparés octet par octet au checkpoint précédent : inchangés.

Les nouveaux cas utilisent un fournisseur simulé : six conversations sociales, massage explicite, devis hors sujet, historique long, confidentialité des traductions et diagnostics. Vingt-trois tests vérifient la nouvelle voie mensuelle et ses refus. Ils ne sont pas des générations Gemma ni une comparaison de qualité avec Haiku.

La recette navigateur GitHub est sans clés fournisseur ni données clients, sur le vrai renderer partagé et le backend compilé avec des sources fictives. Elle interdit les accès navigateur externes et ne clique sur aucune confirmation de commande ou paiement. Ses captures montrent **le guidé**, pas une nouvelle inférence cloud. Le paquet hébergé avec les surcharges UX a été compilé séparément ; ces captures ne certifient pas chaque différence visuelle non publiée de l'autre checkout.

Le badge « IA locale » hérité du transport de laboratoire apparaît encore dans les captures GitHub ; il ne décrit pas leur fonctionnement, qui est guidé sans modèle. La notice de recette et le JSON de preuve le précisent. L'aperçu hébergé, lui, porte l'identification TEST cloud.

Les premières recettes ont révélé deux hypothèses de fuseau dans le test — « 9 h » n'était pas un créneau réellement proposé par le serveur UTC, et « demain » différait après minuit à Paris — puis une cadence automatisée trop rapide pour le throttle partagé. Le test lit maintenant la date et l'heure réellement publiées. Une file globale espace toutes les requêtes, y compris les rafraîchissements de devis des deux appareils ; espacer uniquement les messages n'avait pas suffi. Aucune protection métier ni donnée de service n'a été affaiblie. Une erreur de typage de la nouvelle configuration mensuelle a aussi été corrigée avant le contrôle final. Les runs intermédiaires en échec ne sont pas présentés comme verts. L'inspection visuelle du premier run vert a révélé une capture trop précoce du total, encore en chargement : une assertion attend désormais le texte du montant réellement affiché dans le formulaire, indépendamment de la réponse API à 75 euros.

**Validation finale entièrement verte :** [run GitHub Actions 39505905461](https://github.com/tpenalba06/HOSTBUDDY/actions/runs/39505905461), commit distant `852cefa4af1794ce041d19584eac8e94de954526`, branche isolée `qa/nona-cloud-free-20261020`, déploiements Git désactivés sur cette branche. Les contrôles de non-régression, TypeScript, lint, compilation et navigateur réussissent ensemble.

**26 messages navigateur**, treize par appareil, six langues ; petit-déjeuner, changement de sujet, massage, reprise du petit-déjeuner, informations inconnues et conversation sociale allemande en repli. Total serveur **75 euros réellement affiché** dans le formulaire sur desktop et mobile avant capture. Contacts vides, consentement décoché, confirmation désactivée ; aucune commande ni paiement. Aucun appel IA, aucune erreur JavaScript et aucun débordement horizontal détecté. Desktop 1440 × 1000 ; mobile Chromium 390 × 844 avec paramètres tactiles, pas un téléphone physique ni un test Safari.

Vingt-six captures récupérées, archive SHA-256 vérifiée. Les deux vues du total ont été ouvertes et inspectées : [desktop](evidence/nona-beta-desktop-75-20261020.png), [mobile](evidence/nona-beta-mobile-75-20261020.png). Journal des messages : `evidence/nona-beta-browser-20261020.json`. Métadonnées du run et de l'archive : `evidence/nona-beta-verification-20261020.json`. Les captures sélectionnées sont conservées avec le checkpoint, indépendamment de l'expiration de l'artefact GitHub après sept jours.

L'aperçu corrigé est réellement déployé dans le projet isolé `prj_JNddG5i5NkQyvQI83Blh7X02GVzV` : déploiement `dpl_Cuup4oPnhVsG1dHhznNmDq2hi5nx`, **staging / Preview, READY**, [URL protégée](https://nona-concierge-test-20261020-hz0ql4dq2.vercel.app/). La protection SSO reste en place ; le lien temporaire de consultation n'est pas enregistré dans GitHub. Aucune variable d'autorisation IA n'a été renouvelée.

Contrôles HTTP réels sur ce nouvel aperçu : guide synthétique 200, dialogue guidé 200 avec zéro appel modèle, code serveur et `.env` en 404, commande 405, origine étrangère 403. Recherche des deux vraies clés privées dans les cinquante-huit fichiers du paquet : aucune occurrence. Preuves : `evidence/nona-beta-hosted-closed-20261020.json` et `evidence/nona-beta-package-scan-20261020.json`.

## Coût et latence : mesures disponibles, sans nouvelle estimation présentée comme facture

La recette cloud précédente reste la dernière mesure réelle : quatorze générations, somme des lignes fournisseur arrondies **0,00399 USD**, couvertes par Free ; nouveau paiement **zéro**. Treize réponses ont des tokens locaux connus : 28 062 entrants, 1 646 sortants, estimation partielle 0,00357044 USD ; la dernière est incertaine. Latence fournisseur médiane 884 ms, plage 581–2 577 ms, sans les contrôles d'admission ni le rendu navigateur.

Projection mécanique de cet ancien échantillon : vingt conversations par logement et par mois, six générations par conversation, cache et longueur identiques. Les nouvelles consignes changent le contexte : ces montants doivent être remesurés et ne garantissent ni l'accès Free permanent ni une facture en euros. Hébergement, taxes et change exclus.

| Logements | Conversations mensuelles | Projection IA USD/mois |
| --- | ---: | ---: |
| 10 | 200 | 0,34 |
| 100 | 2 000 | 3,42 |
| 500 | 10 000 | 17,10 |
| 1 000 | 20 000 | 34,20 |

Gemma est conservé. Aucun nouveau test Haiku financé ou gratuit n'est établi et aucun classement comparatif n'est inventé.

## Conditions restantes pour la bêta

1. Nouvelle recette cloud bornée à autoriser explicitement : quinze minutes, vingt générations maximum, Free uniquement, zéro paiement, arrêt si les conditions gratuites ne sont plus établies. Rejouer les trois messages réellement problématiques, le parcours serveur à soixante-quinze euros, les six langues, les sources inconnues et les transitions. Mesurer l'acceptation de la prose, les motifs de repli, les tokens et le temps complet côté navigateur. Les préparations actuelles ne prouvent pas l'amélioration réelle de Gemma.
2. Vérifier la voie de financement durable et ses conditions contractuelles avant toute activation mensuelle. Le code fermé est prêt ; le financement sûr du fournisseur n'est pas démontré. Aucun achat ni plafond mensuel activé pendant cette reprise.
3. Exécuter une session avec un gestionnaire réel sur le logement TEST existant, après la recette IA. La vérification réelle confirme que le logement de comptabilisation est publié et que son organisation possède déjà un compte owner/admin dans Auth ; aucune identité ou adresse e-mail n'a été extraite. Cela ne prouve pas qu'une personne réelle a testé son interface. Le laboratoire actuel expose un catalogue fictif pour atteindre le devis de soixante-quinze euros ; le service du guide TEST réellement publié a un autre tarif et n'a pas été modifié. Aucun nouveau compte, invitation, logement, événement de facturation ou commande n'a été créé. Le parcours gestionnaire réel n'est donc pas prétendu validé. Preuve minimale : `evidence/nona-beta-manager-readiness-20261020.json`.

DA, logos, moteurs Services/réservation, Stripe et imports conservés. Aucun déploiement ni modification de production. Aucun Lovable, recharge, abonnement ou activation continue.
