# NONA · Reprise Sweett et aperçu d’import

## État des versions

La Preview TEST du 9 novembre correspond au commit distant ba98b53 et contient le correctif de transport du chat. Les changements Sweett sont issus du bundle bb35cfe, conservé avec ses captures. La branche work/nona-smart-import-20261111 part de ce checkpoint et reprend le correctif du chat via le commit 9da3507.

## Résultats sur le build local

- Le lot Sweett apporte les étapes d’arrivée, les photos de rubrique, l’accès à NONA et le QR Wi-Fi dans les aperçus. Le QR n’est pas autorisé dans le livret public. Le rattachement d’une photo à une étape et l’essai du QR sur appareil physique restent à réaliser.
- Le téléphone de l’accueil utilise le même composant de livret pour Villa Mare et l’aperçu personnalisé. Le texte est traité en mémoire et l’URL passe par le moteur existant. Le téléphone reçoit uniquement les heures d’arrivée et de départ et la capacité sous forme structurée. Les extraits bruts, codes, mots de passe, URL et images sources sont exclus de cet échange. Le retour à Villa Mare réinitialise l’aperçu.
- L’image locale est signalée comme illustration. La provenance commerciale de la bibliothèque complète et l’enrichissement touristique, météo et transports restent à établir. Aucun enrichissement externe n’a été exécuté.
- Le test navigateur du lien vérifie le rejet d’un hôte local. Aucun import réel réussi depuis Airbnb, Booking ou Sunver n’a été observé dans cette recette. La limitation de l’URL fonctionne par instance et nécessite une vérification de la limite cumulée avant ouverture à un trafic public.
- L’inscription existante reste accessible sur l’accueil. La reprise de l’aperçu après inscription et sa transformation en brouillon ne sont pas implémentées.

## Points de navigation à mesurer après stabilisation

| Priorité | Surface | Observation ou vérification à mener | Critère |
|---|---|---|---|
| P0 | Voyageur | Le QR d’aperçu est isolé, mais les données héritées des rubriques publiques peuvent encore contenir des identifiants. Examiner instantanés publics, chat, médias et sauvegardes hors ligne. | Zéro secret sans autorisation de séjour valable, y compris après révocation, expiration et pour un autre logement. |
| P0 | Gestionnaire | L’éditeur ne dispose pas encore d’un circuit complet distinct pour les informations propres au séjour. | Séparation explicite entre contenu public et instructions réservées, avec accès de séjour révocable. |
| P1 | Gestionnaire | L’audit Sweett relève que l’organisation des rubriques, des médias et de la visibilité rend le passage de l’import à la publication difficile à anticiper. | Mesurer le chemin du premier import à la publication, identifier une action principale par écran et rendre les réglages avancés accessibles sur demande. |
| P1 | Voyageur | Sur le livret TEST, les raccourcis et la liste complète des rubriques occupent l’accueil. | Vérifier l’accès à l’arrivée et au Wi-Fi en une action et déplacer les rubriques secondaires sans supprimer leur accès. |
| P2 | Deux rôles | Les formulations et la place des aides varient avec l’écran et la langue. | Recette clavier, six langues, chargement lent, états vides et overlays sur 360 px, 390 px et 1440 px. |

Ces observations proviennent du code, des captures historiques et d’une recette simulée. L’audit intégral des deux rôles, ses mesures et la refonte UX restent à faire après stabilisation du premier chantier.

## Vérification

- TypeScript, lint des fichiers modifiés et build local réussis.
- Vitest : 686 réussis et 2 ignorés. Tests Node : 22 réussis et 1 ignoré. Le test de boucle locale a réussi avec l’accès réseau local autorisé après un premier refus de connexion dans l’environnement restreint.
- Playwright avec données fictives sur 360 × 800, 390 × 844 et 1440 × 900 : affichage initial de Villa Mare, import texte, ouverture de l’arrivée à 16 h, omission du code fictif, retour à Villa Mare, rejet d’un hôte local et absence de débordement horizontal. Captures dans le dossier de preuves de la reprise.
- Autorisation de séjour, assainissement des données historiques, import URL réussi depuis les plateformes et recette distante de l’ensemble restent à valider. La Preview hébergée ne contient pas cette branche.
