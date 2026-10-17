# Continuation V1 — QR et contrôles tactiles

## Corrigé

- Le QR n'est plus généré à partir d'une route relative pendant l'hydratation. Un scanner reçoit une URL absolue utilisant l'origine de l'application ouverte.
- Un changement de logement ou de chemin invalide immédiatement les anciens téléchargements. Les résultats asynchrones d'une génération précédente sont ignorés après nettoyage de l'effet React.
- PNG et SVG sont générés ensemble à partir de la même URL. PNG exporté en 1024 × 1024, marge QR de deux modules, correction M.
- Les chemins externes et protocoles exécutables sont refusés ; les slugs sont encodés comme un seul segment et les noms de téléchargement sont nettoyés.
- Copier et imprimer ne soumettent plus accidentellement un formulaire parent. L'impression reste désactivée tant que le QR n'est pas disponible et signale une fenêtre bloquée.
- Contrôles QR : hauteur minimale 44 px, colonnes flexibles, image à dimensions explicites, URL imprimée pouvant revenir à la ligne.
- Alt et erreurs QR disposent de traductions FR/EN/ES/DE/IT/PT dans `qr-copy.ts`, à intégrer via `addQrCopy(translations)` par le propriétaire i18n.

## Vérifications exécutées le 5 octobre 2026

- Vitest ciblé : **7 tests réussis** sur `qr.test.ts` et `QrCard.test.tsx`.
- Encodeur QR réel exécuté : signature PNG valide, dimensions IHDR 1024 × 1024, SVG complet.
- Tests : URL guide précise, destination démo, refus d'origine externe, encodage du slug, noms de fichiers, aucun QR relatif exportable en rendu initial, boutons sans soumission implicite.
- TypeScript global `tsc --noEmit` : **réussi** pendant cette passe.
- ESLint ciblé : zéro erreur ; avertissement Fast Refresh préexistant lié à l'export `guideUrl` dans `QrCard.tsx`.

## Encore à vérifier réellement dans le navigateur cloud

1. Sur un logement fictif publié, ouvrir la carte QR à 360 et 1440 px.
2. Télécharger PNG et SVG, constater les fichiers téléchargés et ouvrir le PNG.
3. Scanner le PNG avec un téléphone physique : bon guide, bonne origine.
4. Imprimer avec popup autorisée et vérifier l'erreur avec popup bloquée.
5. Changer rapidement de logement et constater que le QR téléchargé correspond au dernier logement.

Ces contrôles visuels, téléchargements navigateur et scan physique ne sont **pas** annoncés comme faits par cette passe. Le QR de la démo mène volontairement à `/demo`, jamais à un faux guide publié.

## Périmètre

Cette passe n'a pas modifié la DA, `ManagerShell`, `GuideView`, les données réelles ou les politiques de sécurité. Le contrôle responsive des autres écrans et des sept tailles reste piloté par la validation navigateur du chantier principal.
