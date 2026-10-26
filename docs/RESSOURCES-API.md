> **Référence NONA** — Dépôt de code NONA/HostBuddy ; ne pas modifier la production ou Lovable.
> Copie commune et référentiel ChatGPT personnel : `BIBLIOTHEQUE_APIS_NONA_LOULOU_FOLIORELAY.md`.
> Ajouter ce fichier sur une branche documentaire isolée pour éviter un déploiement ou une synchronisation Lovable involontaire.

# Bibliothèque d'API — NONA, LOULOU et FolioRelay

**Créée le 26 octobre 2026.** Référence de découverte pour les projets de l'utilisateur. **Ce document n'autorise aucune intégration, création de compte, coût ou changement de production.**

## Quand ChatGPT / Work doit la proposer

Quand nous travaillons sur **NONA**, **LOULOU** ou **FolioRelay / FolioRelais** et cherchons une solution pour la **météo, les cartes et adresses, l'itinéraire, les transports, les jours fériés, les données locales, les événements, les documents, l'automatisation ou d'autres services tiers**, commencer par consulter ces catalogues puis les documentations officielles. Proposer 2–3 solutions proportionnées, y compris une option gratuite pour usage commercial lorsqu'elle existe et est vérifiée. Ne pas attendre que l'utilisateur pense lui-même à demander « une API ».

## Catalogues à conserver

- **Public APIs (principal)** : https://github.com/public-apis/public-apis — liste collaborative d'API. Un *annuaire*, pas une API ni une garantie de gratuité actuelle.
- **Free Public APIs (complément)** : https://github.com/free-public-apis/apis — second index thématique, à recouper.
- **API publiques françaises** : https://api.gouv.fr/ — annuaire d'API publiques (vérifier l'éligibilité à chaque API).
- **Données ouvertes françaises** : https://www.data.gouv.fr/ ; API du catalogue : https://www.data.gouv.fr/api/1/ — métadonnées de jeux de données, accès et droits à contrôler au niveau de chaque jeu.

## Pistes utiles, par projet

### NONA — guide voyageur / concierge
- **Météo du séjour** : prévisions par logement, messages adaptés (pluie, canicule) ; étudier fournisseurs météo et conditions de réutilisation *commerciale*.
- **Cartes / adresses** : recommandations proches, itinéraires, points d'intérêt, distance, transport ; distinguer *données cartographiques*, *géocodage*, *tuiles* et *recherche de lieux*, qui peuvent avoir quatre licences et tarifs différents.
- **Jours fériés / transports / agenda local** : recommander activités et anticiper fermetures.
- **Données du logement et réservations** : priorité absolue aux sources approuvées du gestionnaire. Une API publique ne donne pas accès à Booking, Airbnb, aux PMS ni aux données privées sans autorisation officielle.

### LOULOU — SaaS boulangeries
- **Météo** : enrichir de façon optionnelle les modèles de prévisions de ventes (pluie, températures, jours chauds) après validation statistique.
- **Jours fériés et vacances scolaires** : variables calendaires pour prévision, planning, production et réassort.
- **Cartes / géocodage** : localisation des boutiques et laboratoires, distances entre sites, tournées ; pas de cartographie complexe sans besoin prouvé.
- **Open data locale** : événements, marchés, affluence indirecte éventuelle ; vérifier fiabilité et couverture.
- **Caisses** : un annuaire d'API gratuites ne remplace **pas** les API/contrats officiels Lineosoft, Crisalid, DGsys et autres éditeurs. Respecter sécurité et autorisations fournisseur.

### FolioRelay / FolioRelais — projet SaaS
- Base de découverte pour des **API de documents, fichiers, extraction structurée, intégrations métier, notifications, calendriers, automatisations, contrôle d'identité, géolocalisation ou météo** seulement quand le besoin fonctionnel est confirmé.
- Ne pas supposer que FolioRelay utilise déjà une API spécifique, et ne pas toucher à son environnement préproduction sans demande.

## Quelques exemples à investiguer (non intégrés)

| Sujet | Service | Vérification critique avant adoption |
| --- | --- | --- |
| Météo | https://open-meteo.com/ | API hébergée gratuite principalement pour usage **non commercial** ; abonnement/licence commerciale pour SaaS, même si données CC BY. https://open-meteo.com/en/pricing |
| Cartographie | https://www.openstreetmap.org/ | Données OSM sous ODbL ≠ tuiles gratuites illimitées. https://operations.osmfoundation.org/policies/tiles/ |
| Géocodage | https://nominatim.org/ | Serveur public OSM limité, max **1 requête/seconde** et pas d'autocomplétion. Ce n'est pas un backend libre-service recommandé pour un SaaS à échelle. https://operations.osmfoundation.org/policies/nominatim/ |
| Jours fériés | https://www.openholidaysapi.org/ | Licence de données ODbL et usage commercial annoncé ; vérifier couverture géographique, quotas, disponibilité et mises à jour. https://www.openholidaysapi.org/en/faq/ |
| Données publiques FR | https://www.data.gouv.fr/ | Licence et fraîcheur à vérifier pour chaque jeu ; ne pas confondre API catalogue et données elles-mêmes. |

## Checklist obligatoire AVANT toute intégration

1. **Besoin réel** : montrer la fonctionnalité et le bénéfice pour le client.
2. **Source officielle à jour** : documentation, statut, licence de l'API ET licence des données (distinctes), restrictions d'usage commercial, obligations d'attribution.
3. **Coûts** : gratuit sans carte ou essai limité ? quota, dépassement, facturation automatique, limites réelles ; **aucune dépense sans autorisation**.
4. **Robustesse** : uptime/SLA, latence, couverture France/international, limites, cache autorisé, repli en cas de panne ; éviter de créer une dépendance critique à une API bénévole.
5. **Confidentialité** : RGPD, transfert hors UE, données de voyageurs/employés, consentements et journalisation minimale ; clé uniquement serveur.
6. **Architecture** : adaptateur interchangeable, tests mock + réels autorisés, quotas, monitoring, pas de modification imprévue du moteur métier.
7. **Décision** : noter « idée », « à évaluer », « retenue » ou « intégrée » ; ne jamais faire passer ce catalogue pour des fonctionnalités livrées.

## Consigne réutilisable pour ChatGPT / Work

> Pour NONA, LOULOU et FolioRelay, lorsqu'on cherche une solution à une fonctionnalité liée à des données externes ou un service, pense systématiquement à consulter les catalogues `public-apis/public-apis`, `free-public-apis/apis`, `api.gouv.fr` et `data.gouv.fr`. Vérifie ensuite les conditions officielles et propose, quand approprié, des APIs intégrables avec un vrai usage commercial et des coûts maîtrisés. N'utilise pas une API juste parce qu'elle est listée « free ». Pas de service payant, Lovable, données privées, ni déploiement sans autorisation. Informe-moi des opportunités pertinentes spontanément.

## Stockage / maintenance

- Copie persistante dans la **Bibliothèque personnelle ChatGPT** (si l'upload est confirmé) ; retrouver par nom **`BIBLIOTHEQUE_APIS_NONA_LOULOU_FOLIORELAY.md`**.
- Copies de référence GitHub proposées dans `docs/RESSOURCES-API.md` des dépôts NONA et LOULOU, à synchroniser lorsque ces dépôts seront prêts.
- **FolioRelay** : aucun dépôt GitHub correspondant n'était visible dans la connexion GitHub le 26 octobre 2026. Le présent document constitue en attendant sa référence partagée.
- À chaque recherche ou adoption : mettre à jour les liens, la date de vérification et la décision ; la disponibilité/les prix peuvent changer.