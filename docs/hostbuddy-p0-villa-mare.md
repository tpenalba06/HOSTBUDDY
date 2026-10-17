# HostBuddy — consolidation P0 Villa Mare

## Livré

- Une source Villa Mare pour la couverture, la galerie, les images des sections, les textes, les adresses, les services et les données opérationnelles fictives.
- Le téléphone de la homepage utilise désormais `GuideView`, comme le guide public, la démo voyageur et l’aperçu gestionnaire. Son lien ouvre `/demo`.
- Les données modifiées dans le gestionnaire démo alimentent immédiatement le guide voyageur. Les deux modes restent montés pour conserver l’écran de travail pendant les bascules.
- La démo conserve `ManagerShell` et les écrans du gestionnaire réel ; sa frame extérieure ne défile plus en mode gestionnaire, le contenu principal possède le scroll.
- Connexion visible dans le header mobile ; couverture voyageur compacte, Services pleine largeur puis raccourcis en deux colonnes.
- Les prix des commandes fictives proviennent du catalogue partagé : petit-déjeuner 25 €, massage 90 €, transfert 60 €, départ tardif 35 €.
- Correction complémentaire : les métriques du dashboard démo utilisent les propriétés à jour ; l’aperçu explicitement mobile bénéficie également de la couverture compacte.

## Vérifications effectuées

- `npm run check` passe : lint sans erreur (16 avertissements Fast Refresh préexistants), 123 tests dans 25 fichiers, TypeScript et build production.
- Quatre tests nouveaux contrôlent les médias et services partagés, la propagation des modifications, le refus des images étrangères et les prix des données opérationnelles.
- Navigateur sur le preview public : ouverture de la démo, gestionnaire, édition du nom de Villa Mare, passage au voyageur et affichage immédiat du nouveau nom, retour au gestionnaire avec l’éditeur conservé. Nom de démonstration rétabli ensuite.
- Catalogue voyageur vérifié : quatre services, photos et tarifs conformes. Mention explicite « aucun paiement en ligne » dans la démo.
- En mode gestionnaire desktop : frame mesurée 1222 × 768 px, hauteur de contenu identique à la frame, absence de scroll extérieur interne à cette frame.
- Cadre mobile demandé à 390 px : largeur de contenu 373 px après scrollbar, scrollWidth égal à clientWidth. Couverture courte, Services et grille visibles. Ce contrôle dans un cadre desktop ne remplace pas une vérification sur téléphone physique.
- Homepage mobile observée dans l’éditeur Lovable : connexion visible. Le rendu était un aperçu statique ; le clic sur le téléphone n’y a pas été vérifié.
- Captures jointes : gestionnaire desktop et cadre voyageur mobile. La matrice 768/1024/1440 et les appareils physiques restent à compléter.

## Stripe : accès externe indispensable

Le SDK, les routes Checkout/Connect et les contrôles de webhooks existent déjà dans l’application ; leurs tests automatisés passent. Aucun nouveau paiement réseau Stripe n’a été effectué pendant cette passe. L’ouverture du tableau de bord Stripe n’a pas abouti ; aucun accès authentifié au compte n’est confirmé.

L’outil Lovable confirme que l’ajout de Stripe nécessite une configuration utilisateur depuis `https://lovable.dev/dashboard?connectors`. Les clés de test et secrets de signature doivent être renseignés uniquement dans les secrets serveur Lovable, jamais dans le chat ou le frontend. Il reste à valider Connect, paiement test, commission de 2 %, doublons, expiration, remboursements et isolation des organisations avant activation réelle.

## Non terminé / production

- Stripe test réel et configuration sécurisée du compte.
- Imports URL réels Airbnb/Booking/Sunver et qualité des photos importées.
- Offline après fermeture/réouverture et perte de réseau sur Android et iPhone, notamment vidéo. Le manifeste est généré uniquement au build ; son artefact local contient 120 ressources, environ 3,49 Mio. La tentative d’ouverture du manifeste du preview a été bloquée par le client navigateur : cela ne prouve ni sa présence ni un défaut serveur.
- Transcodage serveur, livraison des invitations, traduction fournisseur et scénarios auth/rôles complets.
- Téléchargement QR depuis le bouton et scan physique.
- Matrice responsive et performance complète.

Le preview public a bien servi le commit d’unification pendant les tests (classe manager `overflow-y-hidden`, couverture et données partagées observées). Les deux corrections complémentaires et ce rapport sont livrés dans un commit suivant. Leurs contrôles automatisés passent ; leur rendu navigateur doit encore être revérifié après synchronisation.

Aucun déploiement production effectué pendant cette passe. Aucune donnée réelle supprimée, aucune réinitialisation de base, aucune migration de sécurité. Les manipulations du nom restent locales à la démo.
