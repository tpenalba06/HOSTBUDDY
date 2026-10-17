# NONA — état de reprise du 17 octobre 2026

## Mandat et protections

Poursuivre les travaux indépendants jusqu’à la bêta puis au lancement, sans renvoyer les opérations techniques à l’utilisateur. Aucune utilisation du service Lovable, de ses connecteurs ou crédits ; aucun déploiement en production, achat, abonnement, paiement réel, Stripe Live ou modification de Supabase production. La DA et les tarifs validés restent inchangés (1 logement gratuit ; 2 à 9,99 €/mois ; +2,99 €/logement ; 2 % sur les paiements de services).

L’autorisation de 5 € ne suffit pas à activer un fournisseur sans garantie de facturation. Le plafond applicatif de 4 € est conservé ; aucun registre TEST n’a été renouvelé ni activé pendant cette passe. Les appels cloud restent désactivés. Le laboratoire local utilise Ollama/Qwen3.5 9B ; il ne valide pas Haiku.

## État du dépôt et de la CI

- Branche locale : `feat/guest-guide-v2-lot1`, HEAD `036a5ac3bf471ebb1859d4cfa32ef3d6a87dae79`, identique au HEAD distant vérifié en lecture seule.
- Main distant : `53e4a6857f6778ffad5feaf4f3c49dee8cfd6df0`. La branche est 311 commits devant et 2 derrière ; les deux commits propres à main concernent seulement `.github/workflows/billing-sync-preview.yml`, dont un checkout explicite de la branche feature. Ne pas fusionner automatiquement ce workflow.
- Le HEAD contient `[skip ci]` et n’a pas de validation distante propre. Dernier échec observé : run `38664136768`, job `116192022532`, commit `0a1ee072c513e1fe928d28b5379d904efef701a2`, étape `npm run lint`, erreurs de formatage. Ces erreurs sont corrigées localement, pas publiées.
- Le build réellement hébergé n’a pas été vérifié. Ne pas contacter l’ancien hébergement Lovable. Aucun push vers la branche connectée : il synchroniserait le service interdit. Aucun commit, push, merge ou déploiement effectué pendant cette passe.
- État initial conservé dans `work/nona-launch-checkpoint-20261017-1632` : 76 fichiers modifiés ou nouveaux, patch et bundle de l’historique. Les sauvegardes antérieures restent conservées.

## Changements réalisés

- Configuration Vitest distincte du build de l’application ; suites natives Node collectées séparément et intégrées à `npm test`. Les tests ne chargent plus les plugins cloud du build pour s’exécuter.
- Réparation des fixtures devenues invalides : catalogue média des services, inventaire des 26 migrations, mock partiel des langues, sélection du vrai dialogue de message. Aucun droit SQL ni déclencheur de sécurité n’a été assoupli.
- Coffre Windows : chargement explicite du module de sécurité fourni par PowerShell avant conversion DPAPI. Aller-retour vérifié avec une donnée fictive ; aucune clé réelle lue ni affichée, aucune configuration Windows modifiée.
- Tests HTTP du laboratoire autonomes sur un port éphémère, en mode local et sans inférence. Ils vérifient cookie, origine, routes financières absentes et refus du mode cloud. Le test POSIX de permissions reste exécuté sous Linux et explicitement ignoré sous Windows.
- Collage long : décisions et provenance fondées sur tous les extraits, plutôt que les huit premiers. L’aperçu conserve le début et la fin ; une rubrique raccourcie exige une vérification humaine. Deux régressions couvrent une contradiction tardive et des identifiants Wi-Fi tardifs.
- Fiche Wi-Fi : reconnaître seulement un mot de passe ne masque plus le texte d’origine contenant le réseau non normalisé. Une régression du rendu partagé couvre ce défaut.
- Serveur de démonstration compilée `compiled-demo-local.mjs`, lecture seule et boucle locale : backend fictif, fetch serveur sortant bloqué, aucune fonction serveur de mutation. La recette navigateur bloque aussi toute requête hors de son origine locale.
- Les recettes navigateur limitées à un scénario enregistrent désormais un résultat distinct, pour préserver les preuves des recettes complètes.

## Preuves et portée

Les résultats finaux structurés sont dans `docs/evidence/nona-autonomous-baseline-20261017.json` et `nona-compiled-import-20261017.json`. Les journaux détaillés se trouvent à côté du dépôt dans `work/nona-launch-*.log`.

La restauration est entièrement fictive, sur de nouvelles bases PGlite en mémoire : 26 migrations, archive de données et dump SQL, comparaison des données et RLS, contenu d’un fichier de stockage et guide publié anonyme. Après restauration, les assertions SQL couvrent publication/facturation, file de synchronisation, intégrité des commandes/paiements, isolation des équipes/locataires et limites publiques atomiques. Cela ne constitue pas une restauration récente de Supabase distant, d’Auth ou d’un stockage client réel.

Le parcours navigateur de collage utilise les composants compilés partagés et une persistance de démonstration en sessionStorage. Il ne prouve pas une création ou une publication dans un compte réel. Les appels externes du navigateur sont bloqués ; une feuille Google Fonts héritée est demandée mais refusée par la recette.

Le laboratoire conversationnel local est accessible à `http://127.0.0.1:4182/nona` lorsque les processus locaux tournent. `Ouvrir-NONA.cmd` reste le lanceur utilisateur. Cette passe a redémarré le modèle et le serveur, puis vérifié un nouvel échange Wi-Fi réellement généré dans Chrome, sans requête externe ni transaction. Les recettes antérieures conservées couvrent petit-déjeuner, massage, arrivée anticipée, restaurants et six langues. Elles ne garantissent pas toute réponse possible.

## Prochaines étapes, sans nouvelle question administrative

1. Continuer la recette des imports avec des sources longues et multilingues, puis une base TEST isolée : création authentifiée, provenance, correction, publication autorisée et lecture voyageur. Ne pas déclarer les imports universels terminés : l’extracteur actuel est déterministe, les connecteurs planifiés restent des stubs et les sources URL réelles n’ont pas été testées pendant cette passe.
2. Compléter les parcours conversationnels locaux et leurs échecs explicites, sans changer l’autorité du moteur de réservation. L’adaptateur Haiku est conservé mais sa qualité, sa confidentialité contractuelle et son enveloppe de facturation doivent être validées séparément avant activation payante.
3. Préparer une voie de revue/CI qui ne synchronise pas Lovable et ne déclenche ni publication ni nouvelle dépense. Ne pas déclarer la CI distante verte sur la seule base des tests locaux.
4. Avant bêta hébergée : vérifier le build effectivement servi, auth/tenant réels sur TEST, politiques de stockage, observabilité et traitement des erreurs. Avant commercialisation : facturation et webhooks en TEST, capacité/publication, sauvegarde externe et restauration récente, alertes et documents requis. Aucun statut « prêt commercial » n’est acquis par cette passe.

Ne pas reprendre la boucle de reconnexion Vercel. Repartir des preuves et journaux existants, préserver les modifications locales et avancer sur les étapes indépendantes.
