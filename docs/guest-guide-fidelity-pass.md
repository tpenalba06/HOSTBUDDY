# Guide voyageur — fidélité perceptuelle et préparation médias

Référence : planche officielle fournie par le propriétaire du produit. Les noms, textes et nombres de rubriques restent ceux du logement : aucune donnée de la maquette n'est injectée dans les vrais livrets.

- Accueil : couverture plein écran, titre éditorial sur deux lignes pour le nom de démonstration, position verticale et contrastes ajustés, commandes circulaires et découverte en bas.
- Rubriques : cartes horizontales de hauteur indépendante du ratio source, photo sur 34 % de la largeur, titres et espacements recalibrés. Toutes les rubriques restent accessibles.
- Adresses : photographies panoramiques 2,5:1, titres compacts, filtres et favoris réels. La photo principale respecte l'ordre des identifiants média.
- Fiche : couverture sans barre supplémentaire au-dessus, panneau ivoire superposé, commandes flottantes, galerie compacte. Les actions téléphone/carte ne sont affichées que si les données existent.
- Desktop : composition photographique en double page pour les rubriques et les fiches ; mise en avant asymétrique pour la liste des adresses.
- Polices Newsreader et Manrope distribuées localement pour un rendu stable ; licences OFL incluses. Illustrations de démonstration isolées sous `public/demo-guide` (jamais injectées par le guide public réel).
- Contrat média et composants : voir `media-requirements-v2.md`. Pas de refonte du back-office, ni de faux téléchargement hors connexion.

Validation locale : 35 tests, TypeScript et build ; lint sans erreur (16 avertissements préexistants). Comparaison navigateur des quatre écrans en 390×960 et 1440×1000, navigation, favoris synchronisés au retour, Wi-Fi et absence d'erreurs JS. La fidélité reste soumise à la validation visuelle de l'utilisateur.
