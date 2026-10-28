# NONA — informations manquantes et faux signal d'urgence corrigés

Reprise du checkpoint `2a6954f`, le 20 octobre 2026. **166 tests passent dans 14 fichiers**, TypeScript et lint ciblé passent. Le serveur et le vrai renderer partagé du guide/chat compilent dans le laboratoire isolé, sans charger les intégrations d'hébergement.

## Changements vérifiés

Les demandes de code de boîte à clés sont désormais traitées directement par le serveur, avant toute réservation de budget ou appel IA. Un code n'est affiché que si un champ original du livret porte explicitement le libellé code/PIN de boîte à clés. Seul cet élément est rendu ; une traduction ou un autre élément de la rubrique n'est pas repris. Si le champ manque, NONA utilise la réponse honnête existante et renvoie vers le gestionnaire. Reconnaissance testée sur les demandes françaises, anglaises, espagnoles, allemandes, italiennes et portugaises. Il s'agit d'une recherche de champs structurés, pas d'une extraction générale de codes depuis des paragraphes libres.

Les demandes d'allergènes sont également arrêtées avant l'IA : le catalogue actuel ne contient aucune information vérifiée permettant une garantie. NONA signale l'information manquante et renvoie vers le gestionnaire. Ce filtre reste conservateur et ne constitue ni une analyse médicale ni une nouvelle fonctionnalité de gestion des allergènes.

Le faux signal d'urgence provenait du mot « danger » à l'intérieur de « sans danger ». Cette expression seule ne déclenche plus l'urgence. Les formulations négatives « pas sans danger », « pas totalement sans danger » et un incendie ou une fuite mentionnés dans le même message restent traités en urgence. L'urgence est évaluée avant les parcours code/allergènes ; ses règles générales restent celles du système existant.

## Preuve sur le serveur compilé

Le gestionnaire de requêtes compilé a été réellement exécuté dans le même processus avec une source de logement synthétique :

| Demande | Résultat | Appels IA |
| --- | --- | ---: |
| Code de boîte à clés absent, avec demande d'invention | Information introuvable, aucune carte contenant un faux code | 0 |
| Allergie, garantie « sans danger » | Information non vérifiée, renvoi vers le gestionnaire, sans message d'urgence | 0 |
| « Sans danger ? Il y a un incendie » | Parcours d'urgence conservé | 0 |

Preuve : `docs/evidence/nona-source-compiled-20261020.json`. Cette exécution ne constitue **pas un test HTTP de bout en bout**, ni une nouvelle recette de génération IA. Les 18 nouveaux tests couvrent également le code présent, les traductions divergentes et la préservation des urgences.

## Limite de validation navigateur

L'aperçu du vrai renderer partagé et du backend compilé a démarré sur `127.0.0.1:4196`, avec données synthétiques, repli guidé et réseau externe désactivé. Le navigateur autorisé a renvoyé un délai de connexion dépassé. Le client HTTP natif a ensuite reçu un refus système `EACCES` vers cette même adresse locale. Aucun contournement réseau, nouvelle installation ou changement de protection n'a été tenté. Le serveur temporaire a été arrêté.

**L'affichage ordinateur et mobile demeure non validé.** Une URL de laboratoire joignable par le navigateur autorisé est nécessaire pour réaliser cette vérification. Aucun déploiement ou recours à Lovable n'a été effectué pour contourner ce blocage.

## État de reprise

Zéro nouvel appel cloud et zéro dépense dans ce lot. Les relevés réels restent ceux des deux recettes précédentes : 29 appels cumulés, consommation fournisseur affichée de 0,00570 $ financée par Free, 0 $ payé. L'autorisation TEST n'a pas été rouverte et la politique mensuelle reste inactive selon le dernier état vérifié ; aucun changement distant dans ce lot. Stripe, services, commission, DA et production inchangés.

**État : backend plus fiable, toujours non prêt à activer publiquement.** Restent la comparaison réelle avec Haiku sous enveloppe autorisée, la validation navigateur complète et la vérification finale de l'isolation/confidentialité. Les contrôles du dialogue restent heuristiques ; cette correction ne prouve pas l'absence de toute hallucination.
