# Fournisseurs pour l’import URL NONA

## Intégration préparée

Un connecteur Firecrawl réel sans clé est branché au formulaire de la homepage, exclusivement en Preview du projet TEST, pour deux URL de recette appartenant à NONA. Les pages et leur caractère fictif sont explicites. Aucune URL Airbnb ou Booking n'est autorisée par cette liste. Aucun jeton fournisseur, carte, compte payant, proxy avancé, action navigateur, CAPTCHA, retry ou repli payant.

Le transport utilise le endpoint documenté `/v2/scrape`, formats HTML et Markdown, proxy basic, délai borné, limite de réponse 2 Mo et filtrage strict des deux URL. Il refuse les environnements autres que TEST, les autres sources, les erreurs HTTP et les pages cibles bloquées. Les réponses fournisseur ne sont jamais exécutées. Le texte nettoyé passe dans le moteur multilingue et le filtre public existants. Les médias sans preuve de droits ne sont pas réutilisés ; Smart Fill reste illustratif.

Deux requêtes réelles initiales ont réussi en 807 et 667 ms, sans authentification Firecrawl : preuves dans `validation/nona-firecrawl-live-20261120.json`. Ce fichier décrit les pages fictives ; ce n'est pas une validation des annonces Airbnb ou Booking. L'essai initial a révélé des pertes Markdown, puis la recette du téléphone a révélé des balises HTML encodées : le connecteur combine et nettoie les deux représentations avant classification. La capacité étiquetée en plusieurs langues est reconnue.

L'accès sans clé limité est documenté par [Firecrawl](https://www.firecrawl.dev/auth.md) et son [serveur officiel](https://github.com/firecrawl/firecrawl-mcp-server). Aucun droit de collecte Airbnb/Booking n'en découle. L'usage commercial de NONA et les permissions des sources doivent être qualifiés au regard des [conditions Firecrawl](https://www.firecrawl.dev/terms-of-service), distinctement de l'essai technique sur les pages NONA.

## Fournisseurs à qualifier avant contrat

| Fournisseur précis | Adéquation possible et limite | Accès et coût | Démarche préparée |
|---|---|---|---|
| Firecrawl Cloud | Récupération technique de pages autorisées ; ne constitue pas une licence de redistribution des annonces ou photos. | Essai sans clé limité. Aucun plan payant ni recharge activé. | Demander une confirmation écrite du périmètre commercial et des sources couvertes, sans solution de contournement. |
| GIATA, Open Content Link API et Multicodes | Contenus hôteliers, images, équipements et textes multilingues ; mapping de codes fournisseurs. La résolution exacte d'une URL Booking et la couverture des villas indépendantes restent à confirmer. Ne couvre pas automatiquement Airbnb. | Contrat/clé API ; aucun tarif adapté à NONA confirmé publiquement. Devis et échantillon nécessaires. | [Contact commercial officiel](https://www.giata.com/contact/), demander un essai et les droits pour une démo anonyme et un livret indépendant de la réservation. |
| Bright Data, Airbnb Properties Dataset | Catalogue précollecté comportant titre, description, image et équipements ; l'achat de données ne prouve pas les droits sur les photos ni l'autorisation de la plateforme. | Page officielle : minimum de commande 250 USD, jusqu'à 0,0025 USD par ligne annoncés ; prix et périmètre contractuels à confirmer. Aucune commande passée. | [Page et contact commercial](https://brightdata.com/products/datasets/airbnb) ; demander un échantillon des URL fournies et une chaîne de droits explicite. Aucun Scraper/Unlocker proposé pour contourner les restrictions. |
| Expedia Group Rapid Content | Contenu et images hôteliers sous contrat partenaire ; destiné aux expériences de voyage. Résolution des URL Booking/Airbnb et droit d'usage dans un livret NONA non établis. | Partenariat et conditions commerciales, pas de devis NONA. | Option secondaire, si GIATA ne couvre pas les biens ; [présentation officielle](https://partner.expediagroup.com/en-us/solutions/build-your-travel-experience/rapid-api). |

Sources techniques : [GIATA Open Content Link](https://giatadrive.com/specs), [Multicodes](https://multicodes.giatamedia.com/webservice/specs/), [diffusion GIATA](https://info.giata.com/en/knowledge/giata-drive-content-distribution-guide). Une connexion qui distribue des images vers Booking ne prouve pas le droit de les extraire depuis Booking.

## Texte prêt pour la qualification commerciale

Destinations prévues : contact commercial Firecrawl, formulaire commercial GIATA, formulaire commercial Bright Data. Aucune demande envoyée, aucun compte créé, aucune donnée privée transmise.

Objet : Autorisation et essai pour préremplissage de livrets NONA depuis une URL publique

Bonjour,

NONA développe un livret numérique pour les hébergements. Nous souhaitons qu'un prospect puisse coller l'URL publique de son logement et voir un aperçu personnalisé sans créer de compte. Nous recherchons un accès autorisé aux titres, descriptions, localisation avec sa précision réelle, équipements, capacité, horaires, règlement et photographies.

Pouvez-vous confirmer par écrit :

- La résolution exacte des URL Airbnb et/ou Booking, la couverture des logements indépendants et la disponibilité d'un échantillon pour `https://www.airbnb.fr/rooms/1086157072408105944` et `https://www.booking.com/hotel/gr/vallais-villa.fr.html`.
- Le droit d'afficher et de conserver les textes et photos dans une démo commerciale anonyme et dans un livret indépendant, avec les attributions, durées de stockage, conditions de suppression et restrictions applicables.
- La provenance et les permissions de collecte, sans contournement de protections, ainsi que les garanties relatives aux droits des titulaires des contenus.
- Un accès de recette gratuit sans carte ni facturation automatique, les limites, les tarifs par import ou logement, le minimum d'engagement et les frais de mise en service.

Nous ne souhaitons ni données de voyageurs ni accès aux réservations, codes privés ou paiements. Nous n'engageons aucune dépense à ce stade.

Merci de préciser les limites et de proposer un essai autorisé adapté à ce périmètre.

## Décision avant ouverture des plateformes

N'ajouter aucune source réelle à la liste des accès autorisés sans preuve écrite et vérification des droits de contenu et médias. Un domaine configurable par le prospect ou une case « je suis propriétaire » ne suffit pas à établir les permissions de collecte. Après qualification : ajouter l'adaptateur autorisé, mapper sans correspondance approximative, tester plusieurs annonces et leurs valeurs visibles sur mobile et desktop. Le critère commercial Airbnb/Booking reste NON VALIDÉ tant que ces essais n'ont pas eu lieu. La bêta reste fermée.
