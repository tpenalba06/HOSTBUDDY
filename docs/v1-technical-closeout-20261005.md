# V1 technique — clôture du 5 octobre 2026

Base distante inspectée : `36711a2e6e45c45e6a9e65ac6e47d9d56a6d1c9f`, branche
`feat/guest-guide-v2-lot1`. Aucun déploiement, merge, migration, paiement,
email, mutation de données ou appel Lovable exécuté pendant ce lot.
Les preuves des anciens rapports ne sont pas assimilées à des validations actuelles.

## 1. Stripe Connect TEST

28 tests ciblés passent : politique de commission, création/reprise/expiration
des sessions, remboursement avec `refund_application_fee`, signature et portée
du webhook. Ce sont des tests avec doubles de Stripe, pas des paiements réseau.
Le calcul reste 200 points de base, arrondi au centime : 1 500 centimes donnent
30 centimes HostBuddy. La réutilisation d'une session ouverte et le renouvellement
d'une session expirée sont couverts ; cela ne prouve pas une course de double
clic ni le rejeu réseau d'un webhook dupliqué.

Aucune clé Stripe TEST ni session Stripe autorisée n'est disponible dans cette
exécution. L'état actuel du compte connecté n'a donc pas été lu. Le dernier
rapport historique mentionne `acct_1UN8xaPirDdDd4tf`, `charges_enabled=false` et
un arrêt avant l'accord Stripe ; ce n'est pas une preuve de son état actuel.
Ne pas accepter cet accord ni fournir une identité fictive à un formulaire
d'identité réelle. L'exploitant doit terminer les étapes engageantes si exigées.

À exécuter avec accès sandbox : lire le compte et ses exigences, confirmer
`livemode=false` et les capacités ; créer un service et une commande fictifs,
payer avec un moyen TEST, contrôler livraison Stripe → webhook → registre,
commission en centimes et remboursement de la commission ; répéter double
clic, expiration et événement dupliqué. Aucun de ces parcours réseau n'est
revendiqué comme terminé ici.

## 2. Scheduler Billing

Correction minimale, sans nouveau scheduler : le runner transmet
`X-HostBuddy-Billing-Mode: test`. Après authentification, le handler refuse avec
409 une clé serveur absente/non TEST avant de toucher la queue. Le runner
exige maintenant exactement HTTP 200 et JSON `pending: 0` ; HTML, réponse
incomplète, file restante et HTTP 202 ne donnent plus un faux succès.
Retries réseau/5xx bornés, refus des redirects et restriction preview conservés.
33 tests ciblés passent, dont huit assertions supplémentaires.

L'accès GitHub secrets n'est pas disponible ; la page settings retourne 404
dans un navigateur non connecté. Aucun outil exposé ne permet de configurer
ces secrets. Le workflow existe sur cette branche mais pas sur `main` : son
schedule n'est pas opérationnel depuis cette seule branche. Aucun merge fait.
Aucun appel authentifié réel 200, reconciliation Stripe ou changement réel de
quantité sans gestionnaire n'est prouvé pendant ce lot.

Configuration TEST à fournir par l'administrateur :

- Binding serveur `STRIPE_SECRET_KEY` TEST, secrets webhook TEST et
  `BILLING_SYNC_SECRET` fort ; jamais de préfixe frontend `VITE_` pour ces valeurs.
- Secret GitHub `BILLING_SYNC_SECRET` identique au binding ; variables
  `HOSTBUDDY_BILLING_SYNC_URL` vers `/api/public/billing-sync` sur une preview
  autorisée et `HOSTBUDDY_BILLING_SYNC_TEST_ENABLED=true` seulement après contrôle.
- Rendre le workflow disponible sur la branche par défaut après autorisation
  distincte ; déclencher un run, conserver statut 200/JSON `pending:0`, job ID
  et preuves Stripe TEST. Rejouer
  `scripts/validation/billing-sync-queue.sql` sur une base de test en transaction
  annulée ; contrôler lease, retry et révision concurrente.

Préparation production uniquement : environnement et secrets serveur distincts,
secret d'ordonnanceur propre, URL exacte allowlistée sans redirect, rotation et
responsable d'exploitation définis. Conserver l'activation désactivée. Le runner
actuel est volontairement TEST/preview et doit rester ainsi ; une configuration
production nécessitera une tâche séparée approuvée, pas son détournement.

Rollback code : revenir sur ce commit ; désactiver d'abord le flag de scheduler
si activé ultérieurement. Aucune migration liée à ce correctif.

## 3. Auth / multi-org

12 tests ciblés droits équipe/publication passent. Les SQL de validation
`scripts/validation/team-tenant-isolation.sql` sont présents mais non exécutés
ici. Pas de sessions A/B, JWT, credentials ou boîte email sandbox disponibles.
La requête directe aux settings Auth Supabase expire sans réponse.
L'écran login fonctionne et `/app` anonyme redirige vers `/auth`.

Restent à prouver sur TEST : signup et confirmation, login/logout/reset avec
boîte de capture réservée ; sessions indépendantes A/B, refus réciproques de
lecture ET modification des données, médias et invitations ; invitation et
acceptation, owner/admin/member et restrictions financières/équipe. Les tests
unitaires ne prouvent pas cette isolation en conditions réelles. Aucun email
envoyé à une personne réelle.

## 4. Imports réseau

34 tests sur neuf fichiers passent : JSON-LD, provenance, candidats photos,
robots, SSRF, redirections, pages non immobilières et extraction de texte.
Pas de session pour appeler l'import authentifié et vérifier son enregistrement.
Les probes robots Airbnb/Booking expirent (HTTP 000), sans preuve de blocage bot.
Aucune URL de logement Sunver autorisée fournie ; un probe de domaine n'établit
ni support ni import fonctionnel. Aucun contournement effectué.

Restent à prouver : page publique autorisée et droits photos confirmés →
brouillon sauvegardé → provenance conservée → couverture et galerie stockées
en privé et accessibles aux seules audiences prévues. Le fallback « Coller du
texte » est conservé. Pas de revendication d'intégration Airbnb/Booking/Sunver.

## 5. Pré-production : checklist d'exploitation

- [ ] Inventorier les migrations réellement appliquées sur chaque environnement
      et comparer fonctions, triggers, policies et grants à `0000`…`0019`.
      **Attention : `_journal.json` s'arrête à `0005`.** Ne pas considérer un
      `drizzle-kit migrate` comme preuve que `0006`…`0019` ont été appliquées et ne
      pas rejouer aveuglément les SQL sur une base existante. Un ledger vérifié et
      un responsable de l'application sont nécessaires avant production.
- [ ] Réaliser une sauvegarde chiffrée cohérente de la base (public/auth et
      métadonnées storage), des objets privés Storage et de la configuration
      serveur ; vérifier récupération sur un environnement isolé. Un dump SQL
      ne sauvegarde pas les octets des photos/vidéos. Conserver date, checksum,
      emplacement restreint, rétention et responsable. Aucune sauvegarde actuelle
      ou restauration n'a été vérifiée dans ce lot.
- [ ] Avant chaque SQL : préflight des dépendances et droits, transaction TEST,
      assertions d'isolation/publication/billing puis revue du diff. Ne supprimer
      aucune donnée ou snapshot. Migration `0019` reste intacte.
- [ ] Définir retour du code au SHA précédent et correctif SQL en avant.
      `scripts/rollback/0017_team_invitation_guards.sql` réouvre des vulnérabilités
      et ne constitue pas un rollback sûr de production. Le rollback de `0019`
      réintroduirait le P0 : ne pas l'utiliser pour restaurer les guides.
- [ ] Configurer alertes erreurs serveur, échecs de livraison webhook Stripe,
      retard/échecs de queue et heartbeat scheduler. Vérifier ingestion et alerte
      synthétique TEST, sans payload personnel ni secret. Aucun dashboard,
      destinataire d'alerte ou flux de logs serveur accessible ici.

Contrôles actuels : neuf tests ciblés QR/webhook passent. PNG réel 1024px produit
par `generateQrAssets`, décodé indépendamment avec ZXing : destination exacte
du guide audit publié. Téléchargement via interface gestionnaire et scan avec
téléphone restent non effectués, faute de session/appareil.

Smoke navigateur cloud : guide audit public anonyme affiché, refresh réussi,
auth login affiché, `/app` redirigé et `/legal` affiché. Les seuls messages erreur
vus sur le guide proviennent de l'extension du navigateur, pas de l'application.
Pas d'audit Lighthouse ni de mesure réseau lent effectué : pas de navigateur
local Chrome découvert dans PATH, ni capacité d'émulation réseau exposée dans
le navigateur cloud. Aucun score ni validation mobile inventé.

## 6. Legal

`/legal` conservé et contrôlé dans le navigateur. Informations explicitement
manquantes dans le contenu actuel :

- Éditeur : nom légal, statut, identifiant entreprise, adresse, contact,
  identité de l'hébergeur.
- Confidentialité : responsable et contact, inventaire des données/finalités,
  durées réelles de conservation, prestataires effectivement utilisés,
  procédure d'exercice des droits.
- Conditions : renouvellement, annulation, traitement des impayés,
  conditions des services et politique de remboursement.

Ces informations doivent venir de l'exploitant et être validées ; rien inventé.
L'écran indique déjà qu'il s'agit de documents en préparation.

## Validation et décision

Après chaque lot : tests ciblés et `npm run check`. Lots 1 à 5 réussis : lint
zéro erreur/16 avertissements préexistants, tests 236/236 après le correctif,
TypeScript et build réussis. Les warnings de dépréciation TanStack existants
restent visibles. Le lot Legal fait aussi l'objet d'un check final.

**NO-GO V1 technique** : Stripe Connect/paiement/remboursement réels TEST,
scheduler opérationnel, sessions A/B et Auth email, import photos réseau,
sauvegarde/restauration, alertes et performances restent non prouvés. Le code
et ses tests ne remplacent pas ces preuves externes. Aucune activation Live.
