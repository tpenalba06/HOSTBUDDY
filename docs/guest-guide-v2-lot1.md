# HostBuddy V2 — Lot 1 : design system et guide voyageur commun

Référence visuelle : « Planche UI HostBuddy, élégance méditerranéenne.png », validée le 3 octobre 2026. Base publiée : refactor/shared-manager-phase1 à 9b00e4188184cd31bf78d9e2fd571c442643e5a1. Branche de travail : feat/guest-guide-v2-lot1. Aucune fusion dans main.

## Périmètre livré

- Design system voyageur dans src/styles/guest-guide.css, limité à .hb-guide : sable, sauge assombrie pour la lisibilité, bleu mer, taupe, terracotta ; Newsreader en graisse 400, Manrope, couvertures immersives, cartes photographiques, boutons et espacements responsive.
- GuideView est la présentation commune utilisée par la route publique /l/$slug, Villa Mare, les aperçus des brouillons de démonstration et le composant marketing existant. Les adapters locaux restent séparés des données réelles.
- Navigation directe vers Wi-Fi/arrivée/départ, menu/recherche, toutes les sections existantes et personnalisées, médias image/vidéo, contenus traduits valides, avis externes et contact.
- Les bonnes adresses deviennent des listes et fiches détaillées. Les activités utilisent le même composant lorsque cette rubrique existe. Le JSON de section accepte des entries enrichies (catégorie, adresse, téléphone, lien carte, références de médias). Les anciens items restent visibles. Aucune donnée ni table existante n’est supprimée.
- Les formulaires réels de messages, demandes de services et retours privés conservent les endpoints et les payloads existants. Ils restent accessibles depuis les pages intérieures ; erreurs/réessais gérés, champs facultatifs réellement facultatifs, dialogs avec focus et fermeture clavier.
- Les vrais guides ne prennent aucune photo/donnée de Villa Mare : couverture issue de leurs médias, fond éditorial sans image en l’absence de photo. Les services ne reçoivent plus une photographie générique de petit-déjeuner/spa sans rapport avec le service.
- Une fiche propose téléphone/carte seulement si renseignés. Aucune durée de trajet ni localisation n’est inventée. Les favoris sont conservés dans le navigateur, sans écriture serveur.

Un aperçu voyageur plein écran est disponible à /guide-preview. Il est explicitement identifié comme logement de démonstration et utilise exactement le même composant que /l/$slug. Les vrais livrets restent accessibles depuis les liens publics des logements existants.

## Conservation et limites

Aucun changement des RPC, policies RLS, schémas SQL, authentification, publication, import URL/texte, provenance ou serveur public. Le type de contenu public est étendu de façon additive pour les entries JSON ; le loader serveur garde le même accès RPC et la signature des médias privés.

Pas de refonte back-office : seuls les adapters d’aperçu démo sont raccordés au rendu commun. Le futur éditeur en deux colonnes et l’édition des entries enrichies attendent la validation visuelle. Les anciennes sections n’ont pas automatiquement une photo propre à chaque adresse ; les associations ne sont pas devinées. Les paiements, recherche automatique de lieux et traduction automatique restent explicitement non connectés.

## Vérifications

- npm run check : lint sans erreur (16 avertissements préexistants), 29 tests dans 6 fichiers, TypeScript et build passent.
- 7 nouveaux tests de compatibilité : absence de photos/données de fixture dans un guide réel, Wi-Fi combiné, sections personnalisées et vidéos, coexistence entries/items et sécurité des liens, traductions périmées, services réels, adapters et sections masquées.
- Chromium local : navigation, recherche, Wi-Fi, fiches d’adresses, favoris, services démo et responsive 360/390/768/1280, sans erreur de page ni écriture Supabase.
- Formulaires publics en test isolé : demande depuis une page intérieure, échec/réessai, message et retour privé ; payloads vérifiés sur leurs endpoints, réponses réseau contrôlées uniquement dans le test, aucune écriture Supabase.
- Parcours phase 1 revérifiés : création et isolation des brouillons, édition Wi-Fi, renommage, aperçu du bon logement, conservation après retour voyageur/gestionnaire, import texte avec validation, réponse/résolution des conversations, navigation responsive, connexion et protection anonyme de /app.

Les contrôles isolés ne constituent pas un test de livraison des messages/commandes en base. Le compte HostBuddy n’est pas connecté dans le navigateur agent. L’utilisateur doit tester son vrai livret et ses actions sur l’aperçu Lovable après bascule de branche. Les assets Lovable sont servis en aperçu distant ; ils ne sont pas accessibles via les routes assets du Vite local.
