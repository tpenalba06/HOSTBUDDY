# NONA — vérifications du 21 octobre 2026

## Surveillance HTTP : corrigée et vérifiée

- Dépôt privé NONA-OPS, branche par défaut ops.
- Cause confirmée du run 39611298108 : ancienne cible HostBuddy, HTTP 404 / ROUTE_UNAVAILABLE.
- Cible vérifiée avant remplacement : https://nonaguide.lovable.app/
- Réponse réelle : HTTP 200, contenu NONA attendu, révision déclarée 768b88e6a6b8a915b48f9337117ec8ad3771c61d.
- La métadonnée HTML ne constitue pas une attestation indépendante de déploiement ni une validation commerciale.
- Contrôle renforcé : titre voyageur NONA + contenu main + script applicatif ; 200 générique refusé.
- Neuf tests hors ligne ; un GET borné, sans redirection, sans secrets ni corps de réponse dans les logs.
- Run 39638285217 réussi, puis relance manuelle du job 119355138208 réussie : HTTP 200 / UP / NONA_EXPECTED, 2230 ms.
- Cron horaire conservé à la minute 19 UTC ; barrières et alertes de vraies défaillances conservées.
- Les onze autres workflows sont byte-identiques : santé TEST, sauvegardes, alertes, services et budgets inchangés.
- Cause des fausses alertes neutralisée ; aucune promesse d'absence de toute future panne.

Détail durable : https://github.com/tpenalba06/NONA-OPS/blob/ops/HTTP-MONITOR.md

## Guide : modification isolée validée, sans déploiement

La couverture desktop est placée au-dessus des rubriques. La grille mobile à
deux colonnes, les visuels NONA, le moteur de services et les réservations sont
conservés. Cette modification ne constitue pas une reproduction complète de
tous les écrans de la planche HostBuddy.

Source IA complète conservée : ee6734118ff9de3e25935d2b4759f2e55dace28b.
Checkpoint CSS local : eaedd065eecce059269dfe27295fc18119a774f2.
Branche de recette : work/nona-design-stabilisation-20261021.
La recette applique le patch IA déjà conservé, puis un patch CSS isolé.
Les autres worktrees et leurs modifications UX non publiées sont intacts.

Run final 39640227423, commit fbe1aac5f57a17b856efab8ad0fecdb5480a2a87 : SUCCESS.

- 647 tests Vitest et 19 tests Node réussis ; trois tests ignorés.
- TypeScript, lint et compilation isolée réussis.
- Douze affichages : 390 / 1440 px, français, anglais, espagnol, allemand, italien, portugais.
- Absence de débordement horizontal, sections sous la couverture, services après les rubriques et navigation validées.
- Vingt-six étapes navigateur du concierge partagé et de son API compilée.
- Récapitulatif serveur petit-déjeuner à 7500 centimes rendu sur desktop et smartphone.
- Captures récupérées et examinées : desktop, mobile et récapitulatif à 75 euros.
- Aucun envoi de commande, paiement, appel de modèle ou clé fournisseur sur le runner.

Les premières exécutions du nouveau scénario ont révélé des problèmes de
formatage et d'attente des images dans le harnais de test ; ils ont été corrigés.
La dernière exécution est entièrement verte.

Ces preuves sont une recette avec données fictives et repli GUIDÉ. Le libellé
IA locale du panneau provient du harnais historique ; il n'identifie aucun
fournisseur réel. Elles ne sont pas présentées comme une nouvelle recette Gemma.

Aucun déploiement d'application ni activation de production. La version hébergée
n'a pas été redéployée dans ce travail. Le plafond mensuel de 20 euros reste
désactivé, et aucune autorisation TEST IA expirée n'a été renouvelée.
La bêta cloud permanente n'est pas activée par ce checkpoint.

