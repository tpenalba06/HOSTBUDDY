# NONA — Charte graphique de référence

Version de transmission du 17 octobre 2026. Fondée sur la dernière DA officielle A, avec services en cartes photo. L’expérimentation B ne remplace pas cette référence.

## 1. Intention de marque

NONA accueille comme une maison dans laquelle on se sent attendu. Chaleureuse, bienveillante, rassurante, accessible et soignée. La sensation recherchée : une petite grand-mère attentionnée qui pense aux détails du séjour.

Priorité : émotion, confiance, personnalité. Préserver les photographies généreuses, les titres élégants, les formes douces et le personnage. Éviter le SaaS froid, le luxe intimidant, le minimalisme anonyme et la boutique promotionnelle.

## 2. Statut des spécifications

- **Validé visuellement** : palette, logo NONA arrondi, mascotte, composition des vues, grille voyageur à deux colonnes, grille gestionnaire à trois colonnes, trois touches pêche, photos et ton chaleureux.
- **Valeurs normalisées pour intégration** : les codes couleur ci-dessous reprennent les consignes des dernières planches. Une image générée peut présenter des variations de pixels ; ces codes constituent les cibles à appliquer.
- **Proposition typographique à valider sur un écran intégré** : Lora et Nunito Sans. Les maquettes générées ne permettent pas d’identifier leur police exacte. Ces familles sont proposées pour reproduire leur esprit, pas présentées comme les fontes effectivement utilisées dans les images.
- **Réglages de mise en œuvre proposés** : tailles, espacements, rayons et états ci-dessous. Ils traduisent la DA en règles utilisables ; ils ne sont pas des mesures exactes extraites des planches.

## 3. Palette

| Couleur | Code cible | Rôle |
|---|---|---|
| Crème très clair | **#FCF9F2** · RGB 252, 249, 242 | Fond principal des pages, intérieur des cartes, corps opaque de la mascotte |
| Bordeaux NONA | **#780E2F** · RGB 120, 14, 47 | Logo, grands titres, icônes, action principale, personnage |
| Brun cacao | **#210804** · RGB 33, 8, 4 | Textes pratiques, localisation, libellés Wi-Fi, Équipements, Arrivée, Contact |
| Pêche délicat | **#F8E3D4** · RGB 248, 227, 212 | Bouton Nous contacter et deux flèches de galerie |
| Taupe de soutien | **#A48F80** · RGB 164, 143, 128 | Détails secondaires et séparateurs discrets ; pas le texte essentiel |
| Blanc de présentation | **#FFFFFF** | Fond extérieur des planches uniquement |

**Contours du guide voyageur** : `rgba(33, 8, 4, 0.8)`. C’est le cacao à 80 % d’opacité, donc 20 % transparent. Sur le crème #FCF9F2, la couleur composite est proche de **#4D3834**. Appliquer l’alpha au trait uniquement, jamais à la carte entière ou à son texte.

Le pêche reste ponctuel : trois contrôles dans la fiche desktop, pas un fond de page, ni un remplissage des quatre raccourcis. Sur mobile, ne pas introduire de nouveaux aplats pêche pour compenser l’absence des contrôles desktop.

La terre cuite appartient aux explorations historiques et à la chaleur des photos. Elle n’est pas un nouvel accent actif de cette version finale. Les anciennes valeurs de bordeaux #6B2637 et #641F32 ne doivent pas devenir des couleurs concurrentes.

Les statuts peuvent garder une teinte fonctionnelle discrète, accompagnée d’un libellé. Ne pas les transformer en nouvelle palette de marque. Couleur seule insuffisante pour transmettre un état.

## 4. Typographies proposées pour l’intégration

### Titres : Lora

Une serif chaleureuse pour les titres de page, noms de logements et sections éditoriales. Graisse 500 ou 600, casse naturelle, pas de capitales forcées ni d’espacement artificiel.

- Grand titre desktop : 44 à 52 px, interligne 1,10 à 1,18.
- Titre mobile : 28 à 32 px, interligne 1,15.
- Titre de section : 24 à 28 px desktop, 22 à 24 px mobile.
- Nom de logement sur carte : 18 à 22 px.

Source : [Lora — Google Fonts](https://fonts.google.com/specimen/Lora). Présentation du dessinateur : [Cyreal](https://github.com/cyrealtype/Lora-Cyrillic).

### Interface : Nunito Sans

Pour menus, formulaires, boutons, informations pratiques, descriptions, prix et messages. Graisse 400 pour les textes, 600 pour les libellés, 700 pour les actions importantes.

- Texte courant : 16 px, interligne 1,5 à 1,6.
- Navigation et boutons : 15 à 16 px, graisse 600.
- Légendes et statuts : 13 à 14 px ; ne pas réduire les informations essentielles pour faire tenir une carte.
- Champs sur mobile : 16 px minimum recommandé pour cette interface.

Source : [Nunito Sans — Google Fonts](https://fonts.google.com/specimen/Nunito+Sans).

### Logo : dessin fourni

Le logo final est le **NONA épais et arrondi**, en bordeaux. Utiliser son fichier graphique. Ne pas le recomposer en Lora ou Nunito Sans et ne pas revenir au précédent logo à contraste serif/sans.

Les polices ne sont pas incluses dans ce dossier. Les télécharger depuis les sources officielles avec leurs licences avant redistribution ou auto-hébergement.

## 5. Logo

- NONA seul dans les en-têtes, sans mascotte accolée.
- Couleur principale : bordeaux #780E2F sur crème clair.
- Respecter les proportions et les formes originales ; ne pas étirer, ajouter de contour, ombre ou dégradé.
- Proposition d’espace de protection : au moins un quart de la hauteur du logo autour.
- Proposition de largeur d’affichage : 100 à 120 px sur desktop, 88 à 104 px sur mobile, à ajuster pour conserver les contreformes lisibles.
- Le fichier fourni est une référence raster. Une version vectorielle propre reste à préparer pour les exports de marque ; aucune fonte de logo n’est identifiée.

## 6. Personnage et assistant NONA

### Dessin

Un personnage très rond, doux, presque guimauve. Tête et corps d’un seul tenant, sans cou ou creux d’épaule, sans genre marqué. Deux petits yeux, sourire simple, trait bordeaux, baluchon. Conserver les petites mains arrondies validées.

### Voyageur

Le personnage dépasse du bas de l’écran, mains accrochées au bord. Il constitue l’entrée du chat ; aucun bouton permanent Parler à NONA. Extérieur transparent, corps crème **opaque**. Prévoir une réserve pour qu’il ne recouvre ni texte, ni prix, ni bouton de service.

### Gestionnaire

Version entière en forme d’œuf, petits bras et pieds, baluchon, en bas à gauche sous les outils. Même personnage, même style de trait ; ce n’est pas un deuxième logo.

### Mouvement

- Petit coucou fluide de 2 secondes, environ toutes les 30 secondes.
- Une seule main se lève et s’agite doucement ; visage, corps et autre main fixes.
- Retour naturel au repos, pas de rebond ni de grands effets.
- Respecter la réduction des animations et suspendre le coucou lorsque le chat est utilisé.
- Bulle au survol ou au focus uniquement : idée testée dans B, non imposée à A.
- Identifier clairement l’assistant IA dans le chat. Ne pas prétendre être un interlocuteur humain.

Les animations précédemment produites sont des prototypes de mouvement. Leur tracé n’est pas automatiquement le fichier maître du personnage final.

## 7. Icônes

Style arrondi, chaleureux, simple, trait régulier et terminaisons douces. Calendrier pour Arrivée, ondes pour Wi-Fi, valise pour Équipements, téléphone pour Contact. Icônes bordeaux, libellés cacao.

Proposition : icônes de 24 à 32 px, trait de 2 à 2,5 px, espace de 8 à 12 px avec le libellé. Garder le même jeu dans l’ensemble du guide. Les pictogrammes dessinés sur les planches sont la référence visuelle ; le fichier maître vectoriel du jeu reste à constituer.

## 8. Composants

### Boutons

- Action principale : fond bordeaux, texte crème, graisse 600, libellé explicite.
- Action secondaire : fond crème, trait bordeaux fin, texte bordeaux.
- Contact desktop : fond pêche délicat, icône et texte bordeaux.
- Flèches de galerie : petites pastilles pêche, flèche bordeaux.
- Hauteur de cible proposée : au moins 44 px ; libellé assez grand pour être lu sur téléphone.
- Rayon proposé : 10 à 12 px ; les contrôles de galerie restent circulaires.

### Cartes pratiques voyageur

Grille **deux colonnes**, quatre cartes Arrivée, Wi-Fi, Équipements, Contact. Fond crème, contour cacao à 80 % d’opacité de 1 px, arrondi 12 à 16 px, icône ronde bordeaux et texte cacao. Espacement proposé : 12 px entre cartes, 16 à 20 px à l’intérieur. Chevron indiquant l’ouverture.

### Cartes logements

Photo dominante, nom, statut lisible, Modifier et Voir la fiche. Arrondis de 12 à 16 px, séparateurs doux, pas d’ombre lourde. Les actions de chaque carte ne doivent pas concurrencer Ajouter un hébergement.

### Formulaires

Fond crème ou blanc cassé discret, bordure fine, libellé visible hors du champ. Ne pas dépendre du seul placeholder. Erreurs explicites et proches du champ ; préserver la saisie. Focus visible, par exemple trait bordeaux et halo léger avec décalage.

## 9. Composition et espacements

Échelle proposée : 4, 8, 12, 16, 24, 32, 48 px. Marges de page : 24 à 32 px desktop, 16 à 20 px mobile. Utiliser des espacements réguliers, sans supprimer le caractère généreux de l’univers.

### Gestionnaire

Navigation verticale : Logements, Messages, Commandes, Retours, Connexions, Tableau de bord, Paiements, Équipe, ajout d’un hébergement. La visibilité dépend des rôles existants. Vue hébergements : recherche, filtres Publiés / Brouillons / Corbeille · 30 jours, rangées de **trois logements** sur desktop. Réduire les colonnes sur écrans plus petits, sans écraser les cartes.

Le libellé Corbeille · 30 jours fait partie de la demande produit et de la maquette ; sa présence visuelle ne certifie pas le comportement de rétention du backend.

### Voyageur desktop

Logo et navigation légère, nom du logement, localisation cacao, grande photographie, galerie et deux flèches pêche, accès pratiques, grande section Services additionnels. Le lieu reste la vedette.

### Voyageur mobile

Grande photo accueillante, titre, localisation, grille pratique à **deux colonnes**, section Services additionnels généreuse et visible. Services en cartes photo horizontales dans la référence A. Défilement compréhensible, commandes accessibles au toucher et au clavier, espace réservé à la mascotte.

## 10. Services additionnels

Référence officielle A : cartes photographiques Arrivée anticipée, Petit-déjeuner, Massage, accès Découvrir et Voir tout. Conserver des photos belles et lisibles. Ne pas transformer l’accueil en catalogue promotionnel.

Dans B uniquement : essais de prix et d’unités, boutons Réserver, précision sur la confirmation par l’hôte. Les montants d’exemple ne sont pas les tarifs du catalogue. Ne pas intégrer B automatiquement. Aucun prix, créneau ou disponibilité ne doit être inventé dans le produit.

## 11. Photographie

Lumière naturelle chaude, bois, lin, matières familières, vaisselle, table accueillante, végétation et beaux détails du séjour. Atmosphère habitée, calme et soignée. Éviter le filtre orange uniforme, la froideur d’une banque d’images, l’hôtellerie impersonnelle et les grands aplats sombres sur les photos.

Conserver les proportions, utiliser des recadrages qui respectent le sujet et limiter les superpositions. Les images des maquettes sont illustratives ; elles ne représentent pas un inventaire de logements ou de prestations commercialisables.

## 12. Voix de NONA

Phrases courtes, vocabulaire concret, accueil attentionné et informations utiles. Quelques mots chaleureux suffisent. Exemple : Une question ? Je suis là. Éviter les superlatifs, la fausse urgence, les promesses absolues et le ton infantilisant.

## 13. Contrôle avant intégration

- A reste la source officielle ; B est séparée.
- Fond presque blanc, pas beige foncé ou pêche.
- Une seule teinte de bordeaux de marque.
- Trois accents pêche définis, pas de nouvelle surface colorée gratuite.
- Cartes pratiques crème, trait seul à 80 % d’opacité.
- Deux colonnes voyageur mobile, trois logements par rangée gestionnaire desktop.
- Logo fourni, personnage fidèle, mains conservées, corps opaque et extérieur transparent.
- Photographies et grande section services conservées.
- Textes lisibles, focus et états d’erreur visibles, cibles tactiles confortables.
- Aucun personnage sur un bouton, un prix ou une information essentielle.
- Vérifier sur un vrai écran les fontes proposées et les espacements, qui restent à valider.

## Fichiers associés

- `reference-A.png` : planche officielle, copiée sans modification.
- `logo-reference.png` : logo raster fourni comme référence.
- `mascotte-reference.png` : dessin raster validé comme référence.
- `nona-tokens.css` : variables de départ proposées pour l’intégration, sans police embarquée.

Ce dossier formalise la DA existante. Il n’applique aucun changement au site et ne prétend pas fournir des masters vectoriels qui n’ont pas encore été réalisés.
