# Airbnb / Booking : import automatique depuis la homepage

Vérification du 17 novembre 2026. Référence applicative : `dedf6ea`, sauvegarde documentaire précédente `6cbc3fd`, branche isolée `work/nona-commercial-beta`.

## Verdict et périmètre

L'import automatique anonyme Airbnb et Booking n'est pas livré. Aucun accès autorisé permettant de le réaliser n'a été retrouvé dans les intégrations ou les variables de la Preview TEST. Aucun fournisseur payant appelé, aucune inscription partenaire envoyée, aucun nouvel accord accepté. Aucun nouveau code applicatif ni nouveau déploiement dans cette mission. Preview conservée : https://nona-concierge-test-20261020-p46sffqfy.vercel.app/.

## Touch Stay : observation et distinction indispensable

Parcours réellement ouvert : `https://hub.touchstay.com/sign-up/`, redirection vers `/onboarding/mode/ai`. Le formulaire accepte le lien `https://www.airbnb.fr/rooms/1086157072408105944`. Après Suivant : `/onboarding/ai/property-type`, début de récupération. Après le choix de type déjà sélectionné et Suivant : `/onboarding/ai/contact-information`, demandes d'e-mail, nom et acceptation des conditions à la continuation. Aucun contact fourni, aucun compte créé, aucune condition acceptée. La progression observée atteint 95 %, mais aucun livret personnalisé terminé n'a été validé. L'aperçu « Beach villa retreat » vu pendant l'attente n'est pas une preuve d'extraction de notre annonce.

Leur aide décrit un import ponctuel par URL qui récupère et classe les contenus, avec revue des données. Elle ne documente pas l'API ou le fournisseur utilisé pour cette récupération. L'absence de documentation interdit d'en déduire les droits réutilisables par NONA.

Leur connexion Airbnb continue est un autre parcours : leur aide nomme Hospitable Connect et impose une autorisation Airbnb de l'hôte. Ne pas confondre cette connexion et le générateur par URL.

Sources : [inscription](https://hub.touchstay.com/sign-up/), [import par URL](https://help.touchstay.com/en/articles/15873428-how-to-import-a-guidebook-from-airbnb-or-booking-com), [connexion Airbnb](https://help.touchstay.com/en/articles/13715496-airbnb-integration), [génération pendant l'inscription](https://help.touchstay.com/en/articles/13715505-ai-powered-guidebook-generation-during-registration).

## Chemin réel du moteur NONA

`VillaMarePhone.submit` → `importPublicPreview` → `runPublicPreview` → normalisation et identification de source → `runUrlImport` → permission de lecture → `safePublicFetch` → `extractAccessibleHtml` → `publicImportPreview` → message au téléphone.

- Airbnb : refus explicite `authorization_required` avant le fetch public. Deuxième garde dans `runUrlImport`, y compris sur les redirections. Ajout retrouvé dans `6d342f75964c5a238e7e55b5d80f0970b4452a8d` le 12 novembre. Supprimer ces lignes réactiverait le scraping générique, pas une API autorisée.
- Booking : aucun refus de plateforme codé en dur à ce niveau ; chemin générique conservé, robots puis récupération avec arrêt sur blocage. L'anti-robot historiquement constaté intervient avant l'extraction. Il ne s'agit donc pas d'un simple adaptateur désactivé comme Airbnb. Aucune nouvelle récupération automatique de l'annonce n'a été lancée après vérification des conditions A15.
- Le parseur JSON-LD/Open Graph, la normalisation, le classement et le téléphone sont présents. Ils peuvent être réutilisés après réception de données autorisées. Un test sur un HTML fabriqué ne prouverait pas l'intégration réelle, donc aucune compatibilité revendiquée sur cette base.
- Inventaire Vercel TEST lu sans déchiffrement : aucune variable de connexion Airbnb, Booking, Hospitable ou fournisseur de contenu équivalent. Recherche locale limitée aux noms de configuration et au code : aucune intégration de ces API retrouvée. Cela ne prouve pas l'absence de tout accord commercial extérieur au projet.

## Voies officielles et coûts

| Solution | Accès et aptitude au besoin | Coût vérifiable |
|---|---|---|
| Hospitable Connect pour Airbnb | Candidature partenaire, produit/logo/webhook, validation annoncée sous cinq jours, jeton serveur. Création d'un customer, code d'autorisation valable cinq minutes, connexion et consentement Airbnb de l'hôte, puis lecture des listings. Airbnb seulement. Ne remplit pas le besoin strict « URL anonyme seule ». | Aucun tarif partenaire actuel trouvé dans les pages officielles consultées. Devis nécessaire ; ne pas annoncer gratuit et ne pas confondre avec l'abonnement PMS Hospitable. |
| Booking Connectivity via partenaire existant/PMS | Gestion de données d'établissement avec autorisation. Le portail officiel suspend les nouvelles intégrations de fournisseurs et renvoie les établissements vers un channel manager. Accès contenu/photos et droit de redistribution à confirmer auprès du partenaire existant. | Pas de tarif standard vérifié. Contrat/devis du partenaire, périmètre des contenus et médias à confirmer. |
| Booking Demand API | Statut Managed Affiliate Partner, contrat, Partner Centre, jeton et Affiliate ID. Usage documenté orienté contenu de voyage et redirection/réservation. Une réutilisation en livret NONA indépendant n'est pas établie. | Aucun coût de licence adapté au cas NONA publié dans les documents consultés. Éligibilité et droits à obtenir avant développement. |
| Import URL ponctuel sous licence écrite | Pour satisfaire exactement l'aperçu sans compte, obtenir un accès de contenu autorisé et des droits de photos couvrant les URL publiques et cet usage commercial. Aucun fournisseur ni contrat correspondant identifié avec preuve suffisante. | Inconnu tant qu'une offre écrite n'est pas obtenue. |

Sources : [Hospitable partenariat](https://hospitable.com/become-a-partner), [conditions Connect](https://developer.hospitable.com/docs/connect-api-docs/8e768e6831f6c-requesting-connect-access), [connexion client](https://developer.hospitable.com/docs/connect-api-docs/8orcx0lt66rag-connect-a-customer), [portail Booking](https://connect.booking.com/), [Demand prérequis](https://developers.booking.com/demand/docs/getting-started/prerequisites), [Demand présentation](https://developers.booking.com/demand/docs/getting-started/overview).

Les conditions Airbnb interdisent la collecte automatisée non autorisée. Les conditions Booking A15 exigent une permission écrite pour la collecte automatique. Une autorisation de réutilisation des photos est distincte de l'accessibilité technique et de robots.txt. [Airbnb](https://www.airbnb.fr/help/article/2908), [Booking](https://www.booking.com/content/terms.html).

## Demande de qualification préparée, non envoyée

Obtenir une confirmation écrite du fournisseur : accès par URL Airbnb et/ou Booking sans connexion préalable de l'hôte ; champs disponibles ; droit d'afficher textes et photos dans un livret commercial NONA ; conservation, attribution et suppression ; sandbox ; tarification par import et/ou logement, minimum mensuel, frais de mise en service ; limites ; absence de collecte contournant les protections. Ne retenir une offre qu'après cette qualification. Pour Hospitable Connect, demander séparément les tarifs et les champs effectivement disponibles, sans lui attribuer une capacité d'import anonyme.

Après accès autorisé : brancher la lecture serveur dans les adaptateurs existants ; conserver provenance, filtrage des secrets, précision de localisation, contrôles d'origine et limites de requêtes ; utiliser Smart Fill seulement quand les médias autorisés manquent ; tester les deux vraies URL depuis la homepage sans session NONA ; vérifier les valeurs dans les rubriques du téléphone et les appels réels du fournisseur ; ensuite seulement créer une nouvelle Preview TEST.

Le mode texte n'a pas été présenté comme réalisation de cet objectif. Aucun autre chantier n'a été ouvert.
