# NONA — reprise et intégration des assets officiels

## Point de départ préservé

Révision Lovable vérifiée : `7c8f52d06f54792498a02b766ae13fc683cb60a5`, branche distante `feat/guest-guide-v2-lot1`, dépôt `tpenalba06/HOSTBUDDY`. Les 22 changements de fichiers ont été récupérés et comparés par hash. Le dossier de travail Work initial est conservé sans modification.

Copie active : `output/nona-lovable-sync`, branche locale `work/nona-official-brand-20261018`. Le commit de sauvegarde `5e2315b` préserve cette révision importée et les deux originaux graphiques. Cette branche locale ne représente pas l'historique distant des 23 commits Lovable ; elle contient leur état final vérifié.

## Déjà réalisé dans Lovable

- Logotype et mascotte officiels reliés aux composants partagés, au gestionnaire, au guide et au concierge.
- Favicon NONA, ajustements de présentation du téléphone marketing et du chat.
- Guide desktop avec la grande photo à gauche et les sections à droite. Les cartes mobile en deux colonnes sont conservées.
- Pas de nouvelle animation inventée à partir de la mascotte statique.

## Compléments réalisés ici

- Original du logotype : `public/nona/official-logo.png`, 878 × 217, PNG RGBA.
- Original de la mascotte : `public/nona/official-mascot.png`, 1067 × 577, PNG RGBA.
- Copies binaires identiques aux assets Lovable : aucun réencodage, redimensionnement, détourage supplémentaire ou changement de couleur.
- Chemins statiques centralisés : le projet ne dépend plus des routes d'assets propres à Lovable pour sa marque.
- Remplacement des anciennes marques sur les écrans d'import et dans la zone de présentation marketing ; copyright et métadonnées marketing mis au nom NONA.
- Le cache hors ligne inclut les deux bons originaux, et exclut les anciens rasters de référence.

Composants complétés : `NonaBrand.tsx`, `ImportReview.tsx`, `DemoManager.tsx`, `routes/index.tsx`. Utilitaires : `nona-assets.ts`, `media-offline-plugin.ts` et son test existant. Documentation : `AGENTS.md`, `public/nona/README.md`.

Les composants existants `Logo`, `ManagerShell`, `GuideView` et `NonaConcierge` bénéficient des chemins centralisés. Aucun changement des moteurs de services, réservations, import, IA ou paiement.

## Vérifications et limites

- Identité binaire des deux PNG contrôlée contre les originaux en ligne ; dimensions et canal alpha présents.
- Build complet réussi avec la version 2.26.5 de la configuration Lovable et un backend de recette fictif.
- TypeScript et lint des fichiers de code modifiés réussis ; revue React effectuée (images dimensionnées, textes alternatifs, aucun nouvel effet ni changement de hooks).
- 461 tests Vitest réussis au total après correction du répertoire temporaire de recette ; 2 tests ignorés.
- 18 tests Node réussis ; 1 ignoré. Un test réseau local reste bloqué par `EACCES 127.0.0.1`, sans modification de ce test ni de l'application pour contourner cette restriction.
- Les deux images figurent dans le manifeste hors ligne du build et sont copiées dans sa sortie publique.
- Comparaison avec la planche : couleurs et graphismes officiels conservés, proportions via dimensions intrinsèques et `object-fit: contain`, pas de reconstruction CSS. La disposition desktop gauche/droite choisie dans Lovable est préservée, même si la planche historique montre une photo au-dessus.

**Recette visuelle encore à faire :** aucun navigateur de contrôle n'est disponible dans cette session et les connexions localhost sont refusées. Je ne peux donc pas fournir de nouvelles captures ni certifier l'absence de débordement à 360, 390, 430 et 1440 px. Les captures historiques ne sont pas présentées comme preuves de cette version.

Aucun push, aucune publication, aucune migration, aucun appel IA payant et aucun paiement réel effectués.
