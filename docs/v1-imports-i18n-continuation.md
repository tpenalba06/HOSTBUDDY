# HostBuddy V1 — imports, provenance et internationalisation

Passe du 5 octobre 2026, sans modification de DA ni de données réelles.

## Corrections effectivement implémentées

- Le parseur robots.txt conservait uniquement le dernier User-agent d’un groupe et ignorait Allow, les motifs `*`, `$` et les paramètres de requête. Il applique désormais les groupes, leur fusion, la priorité de la règle la plus précise et Allow à égalité. Une erreur réseau reste bloquante.
- Une redirection de page/photo pouvait être suivie sans vérifier les règles robots.txt de la destination. La destination est maintenant contrôlée **avant** sa requête. Les photos relatives utilisent l’URL finale autorisée.
- Le JSON-LD importait des équipements dont `value` valait `false`. Ces absences ne deviennent plus des équipements disponibles.
- L’extraction de texte de page de confiance 0,6 était remontée artificiellement à « trouvé ». Ces matches restent maintenant « à vérifier ».
- « Pas de piscine », « no parking » ou une piscine publique à proximité pouvaient activer une rubrique spécifique. L’extrait reste conservé en vérification ; il ne valide pas automatiquement la présence de l’équipement.
- Les écrans import URL, import texte et vérification utilisent désormais six langues pour progression, erreurs, actions, labels de champs, droits photo et provenance. Le contenu collé, le nom et les réponses personnalisées restent inchangés.
- Les erreurs vidéo/image connues sont traduites en six langues via `mediaErrorMessage`; les erreurs inattendues ne reflètent pas de détails serveur.
- Les nouvelles traductions QR sont enregistrées dans le dictionnaire partagé.

## Vérifications effectuées

- Suite ciblée import/i18n/médias/registre : **52 tests, 11 fichiers, réussis**.
- TypeScript complet réussi après corrections des types du registre.
- ESLint ciblé : **0 erreur** ; seuls cinq avertissements Fast Refresh existants du dictionnaire central.
- Test fictif de texte volumineux conserve le Wi-Fi situé après 2 000 lignes et laisse un contact absent manquant.
- Tests de redirection vérifient qu’une destination interdite n’est jamais appelée.
- Tests JSON-LD vérifient les équipements explicitement absents sans inventer adresse/contact.

Ces tests sont des validations locales avec fixtures fictives. **Aucun import réseau client Airbnb, Booking ou Sunver n’a été validé par cette passe.** Le repli vers le collage du texte demeure disponible sans contournement de robots, captcha ou accès privé.

## PMS : classification honnête

Le registre inclut désormais les huit priorités. `PMS_READINESS` distingue implémentation locale, accès externe requis et validation réseau. Aucun provider n’est marqué opérationnel sans preuve. Tous gardent le repli texte/page publique autorisée.

| Provider | État HostBuddy | Accès externe requis | Documentation officielle vérifiée |
|---|---|---|---|
| Guesty | Adaptateur implémenté, réseau non validé | Client ID/secret Open API + clé de chiffrement serveur | https://open-api-docs.guesty.com/docs/authentication |
| Lodgify | À implémenter | X-ApiKey client, accès API | https://docs.lodgify.com/reference |
| Hostaway | À implémenter | Account ID + secret, OAuth client credentials | https://api.hostaway.com/documentation |
| Smoobu | À implémenter | HMAC clé/secret ; OAuth multi-client réservé partenaires | https://docs.smoobu.com/ |
| Beds24 | À implémenter | Invite code à scopes, refresh/access tokens | https://wiki.beds24.com/index.php/API_V2 |
| Amenitiz | À implémenter | Offre Advanced bêta, credentials créés par owner, disponibilité à confirmer | https://support.amenitiz.com/en/articles/805686-how-to-understand-the-amenitiz-api |
| Cloudbeds | À implémenter | Compte développeur partenaire/certification ; accès propriété conditionnel | https://developers.cloudbeds.com/docs/getting-started-as-a-partner-in-5-steps |
| Mews | À implémenter | ClientToken intégration + AccessToken entreprise, sandbox/partenaire | https://docs.mews.com/connector-api/getting-started |

Smoobu : la documentation actuelle recommande HMAC et annonce la disparition de l’authentification historique. Ne pas démarrer un adaptateur neuf sur une simple clé legacy. Les dates de retrait dans le changelog et le chapitre courant divergent ; vérifier avant une implémentation réseau.

## Restant / prochaine étape exacte

1. Après synchronisation preview, tester les écrans import URL/texte/review en anglais et français sur mobile puis desktop.
2. Effectuer un import réseau de page générique autorisée avec JSON-LD et photos dont l’hôte possède les droits ; vérifier brouillon, provenance, couverture/galerie et publication après validation.
3. Pour Airbnb/Booking/Sunver, prendre un lien de logement autorisé fourni pour test ; documenter import réussi ou blocage + repli texte. Ne pas déclarer la compatibilité sur les seules fixtures.
4. Guesty : configuration serveur chiffrée et credentials de test indispensables à la validation réseau. Autres PMS non opérationnels, sans fausse connexion.
5. Étendre le contrôle des chaînes visibles aux écrans secondaires non touchés ; cette passe ne constitue pas un audit multilingue exhaustif de toute l’application.

Aucune migration ni suppression de données dans ce lot. Retour arrière : revert du commit du lot, sans changement de schéma. Le commit final est géré par l’agent principal pour éviter un mélange des travaux parallèles.
