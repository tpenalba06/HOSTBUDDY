# HOSTBUDDY — Audit et phase 1

## Point de départ

Branche source : `feature/universal-import-v1`.
HEAD vérifié via Git et la PR #2 : `7a41a24b9f28245a30cd13252312f6e78773ccb1` (`Fixed missing address config`).
Branche dédiée : `refactor/shared-manager-phase1`.
Aucune fusion dans `main`, aucune réécriture d’historique publié.

## Architecture constatée avant modification

React 19, TanStack Start et Router, Vite, React Query, Tailwind avec container queries, Supabase.
Les routes `/app/*` sont protégées par `/_authenticated.beforeLoad` (`auth.getUser`). L’organisation et son rôle proviennent de `ensure_my_organization` et des memberships. Les données gestionnaire passent par les modules de données et les RLS ; le guide public `/l/$slug` passe par une fonction serveur et `get_public_guide`.

`ManagerShell` était déjà commun. Les écrans dashboard, liste des messages, commandes, retours, équipe, connexions et ajout étaient déjà partagés via `ManagerScreens`. `GuideEditor` proposait déjà un contrat d’actions injectables, utilisé par la démo.

La migration était incomplète : `/app` conservait une liste distincte ; les conversations avaient deux composants ; la route d’éditeur contenait ses propres panneaux alors que la démo recevait seulement un `GuideEditor` compact. Les nouveaux logements démo ouvraient tous Villa Mare. Les états du gestionnaire disparaissaient en passant à l’aperçu voyageur. Ces différences venaient des adapters et rendus locaux ajoutés progressivement, sans raccordement de toutes les routes aux composants communs.

## Changements de phase 1

| Présentation commune                                                  | Adapter réel                                                          | Adapter démo                                   |
| --------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------- |
| `ManagerPropertiesScreen` et options de création                      | React Query, navigation Router, liens publics et vrais QR             | État local, navigation locale, QR vers `/demo` |
| `ManagerConversationScreen`                                           | Chargement, réponse, statut et invalidation des queries dans la route | Réponse, lecture et résolution locales         |
| `PropertyEditorScreen`, `PropertyInformationScreen`, `QuestionScreen` | Mutations des champs et du nom dans la route                          | Un état distinct par logement                  |
| `ServicesScreen`                                                      | `ServicesEditor` charge et sauvegarde via Supabase                    | Liste et sauvegarde locales                    |
| `MessagingEditor`, `ReviewEditor`                                     | Callbacks de sauvegarde Supabase                                      | Callbacks locaux                               |
| `GuideEditor` existant                                                | Actions réelles existantes                                            | Actions locales explicites ; même présentation |

Les workflows réels de completion, publication, mise hors ligne et accès membre restent dans la route protégée. Ils ne sont pas remplacés par une simulation. Les fonctions démo de publication/aperçu restent des actions locales : elles ne créent pas de guide public en base. Les réglages d’avis de la démo sont locaux ; ils ne prétendent pas envoyer un avis à une plateforme.

Les brouillons démo conservent tous les champs du catalogue et la provenance importée. Ils ont leurs propres sections et médias ; seuls les champs `found` entrent dans les sections initiales. Les réponses humaines mettent à jour les informations et le guide. Les mises à jour de l’état local sont fonctionnelles pour ne pas écraser une autre modification pendant un autosave.

Le gestionnaire démo reste monté lors du passage au voyageur. Les modifications de Villa Mare au nom, aux informations existantes et aux services se répercutent dans son aperçu. Les brouillons restent en mémoire pendant la session du composant ; leur persistance après rechargement n’est pas ajoutée.

Le shell intégré garde son en-tête et sa navigation basse dans la frame. Le contenu défile indépendamment, avec remise en haut lors des changements d’écran. Un QR s’adapte à la largeur disponible.

Aucune modification de l’authentification, des RLS/migrations, du moteur d’import, des fonctions de données de production ou du fallback public Supabase de `vite.config.ts`.

## Vérifications réellement effectuées

- `npm run test` : **22 tests passent**, dont 7 nouveaux tests. Ils couvrent les liens/actions de la liste, les permissions membre, les conversations, les quatre onglets, l’absence d’accès Supabase depuis les présentations testées, l’isolation des brouillons, les données manquantes/ambiguës et la conservation de provenance après correction.
- `npm run typecheck` : passe.
- `npm run build` : passe sans fichier `.env` ; le correctif build-time reste présent.
- ESLint sur tous les fichiers modifiés : aucune erreur, trois avertissements préexistants (Fast Refresh et dépendances d’effet).
- Lint global : échoue sur les fichiers préexistants hors chantier. Le checkout du commit de départ produit 918 erreurs et 16 avertissements, principalement Prettier. Le résultat global n’est pas annoncé comme vert.
- Contrôles Chromium/Playwright sur le serveur Vite local : `/demo`, navigation gestionnaire, quatre onglets de l’éditeur, activation locale des messages, création manuelle, changement d’information, changement de nom, aperçu du bon logement, retour voyageur/gestionnaire avec conservation du brouillon, import texte avec review et création du brouillon, réponse et résolution d’une conversation.
- Liste responsive à 360, 430, 768 et 1280 px : aucun débordement horizontal. QR réel rendu dans la démo à 360 px sans débordement ; navigation basse située dans la frame.
- Frame de 360 px dans une fenêtre desktop : navigation mobile visible et sidebar masquée, conformément aux container queries.
- `/auth?mode=login` charge ; accès anonyme à `/app` redirige vers `/auth`.
- Pendant ces parcours démo : aucune écriture réseau Supabase détectée et aucune erreur JavaScript de page.

Le service `agent-browser` est bloqué par les sockets locaux de cet environnement. Les interactions ont donc été exécutées directement avec Chromium/Playwright dans le même processus réseau que Vite. Les captures responsive ont également été inspectées visuellement.

## Non testé et points restants

Aucun compte de test authentifié n’a été fourni. Connexion réelle, maintien de session après refresh, déconnexion/reconnexion, création/édition en base, publication réelle, lien public, rôles et isolation RLS réelle ne sont donc **pas validés de bout en bout**. Aucune migration n’a été exécutée, aucun déploiement n’a été effectué. L’import URL réel et les uploads Supabase ne sont pas validés dans cette phase.

Le workflow existant utilise `npm ci` alors que le dépôt contient `bun.lock` et aucun `package-lock.json` : cet écart de CI est préexistant et reste à traiter séparément.

La séparation « En ligne / Brouillons », les compteurs et l’épuration des textes restent la phase 2. La simplification éditoriale complète de l’éditeur reste la phase 3. Les autres écrans et l’amélioration du pipeline import restent les phases 4 et 5. Attendre la validation de cette phase avant de poursuivre.
