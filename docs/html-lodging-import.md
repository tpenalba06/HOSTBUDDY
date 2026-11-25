# Import HTML des logements

| Décision | Architecte | Simplificateur | Développeur | Contradicteur | Directeur produit |
|---|---|---|---|---|---|
| HTTP direct puis parseur DOM | Même extraction pour accueil et gestionnaire | Réutilisation de parse5 et du client HTTP | Le classificateur existant reçoit le texte et les preuves structurées | Les accès refusés restent bloqués. La réponse doit contenir du HTML exploitable | Les pages de recette s’importent sans fournisseur externe |
| Détection et droits des photos | Les catégories suivent les médias et les rubriques existantes | Métadonnées et indices de galerie suffisent pour ce premier essai | Les variantes d’une image sont regroupées et le classement est recalculé côté serveur | Une photo candidate n’établit aucun droit. La copie garde les contrôles de source, de réseau et de tenant | Le gestionnaire confirme les droits. Le téléphone anonyme utilise Smart Fill |

Le moteur lit les métadonnées, le JSON-LD, les objets logement typés présents dans les scripts JSON et le texte du document. Il sélectionne les photos déclarées et les galeries identifiables, en utilisant les descriptions et légendes. Les types de données privés ou non typés demandent un adaptateur documenté. Les galeries rendues uniquement après exécution JavaScript et les doublons visuels portant des chemins différents restent hors de cette recette.

Les catégories correspondent d’abord à une rubrique existante. Les photos de chambres, cuisine, salon, extérieurs, salle de bain et équipements rejoignent La maison si la rubrique spécifique est absente. La piscine rejoint sa rubrique si elle existe. La couverture rejoint Bienvenue. Il n’y a pas de nouvelle structure de données persistante.

Les essais directs Airbnb et Booking s’autorisent indépendamment sur Preview TEST au moyen de `NONA_AIRBNB_HTML_TEST_UNTIL` ou `NONA_BOOKING_HTML_TEST_UNTIL` lorsque la voie HTTP est autorisée. Les contrôles robots et les limites réseau restent actifs. Aucun identifiant d’annonce n’est nécessaire. Firecrawl et les connecteurs restent des options séparées, sans repli automatique après un refus d’accès.
