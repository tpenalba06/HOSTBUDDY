# Nona — exécution courte avant les premiers clients

Offre complète : livrets, abonnements 9,99 € / 2 logements puis 2,99 €, services voyageurs via Stripe Connect, commission Nona 2 %. Aucun paiement désactivé.

## Configuration préparée

La fiche `docs/ops/nona-launch-inputs-20261012.json` consigne observations et réglages à appliquer seulement après autorisation. L’origine Lovable existante permet de préparer le lancement sans imposer un achat de domaine. Un domaine de marque reste un choix commercial, pas une obligation technique à financer maintenant.

Cloud existant : base en Europe (Ireland), PostgreSQL 17.11.0.002, affichage 0,29 Go / 2 Go. Cela ne garantit pas une localisation exclusivement européenne du CDN, support ou journaux. La récupération isolée `mhhtnqfdkyudwyqlmnce` reste distincte du backend applicatif `jzbjpaucgckggumhowns` : les sauvegardes TEST ne valent pas sauvegardes commerciales.

Auth : origine canonique déjà réglée sur l’adresse publiée ; inscriptions autorisées, anonymes désactivés, e-mail et Google activés, confirmation e-mail requise, changement d’e-mail sécurisé, HIBP activé. Le client prévoit `/app` pour confirmation et `/auth?mode=reset` pour récupération. Aucun changement des fournisseurs ou envoi d’e-mail provoqué ici. La documentation officielle décrit l’expéditeur Auth géré : un domaine d’envoi personnalisé n’est pas imposé pour la préparation. Limite d’envoi et réception effective sur l’origine commerciale restent à constater au premier passage légitime, sans répétition du parcours cœur acquis.

Une commande de métadonnées Lovable a confirmé en sandbox seulement la présence de toutes les entrées Supabase/Stripe TEST/Billing nécessaires et l’identité client/serveur de la cible. `HOSTBUDDY_CONNECT_APP_URL` n’est pas défini ; `STRIPE_LIVE_VERIFIED` reste absent et donc non activé. Ce n’est pas une erreur du moteur TEST : le réglage explicite Connect est préparé pour l’origine commerciale et Live reste bloqué volontairement. Aucun secret lu dans la sortie ou copié dans ces fichiers. Ces métadonnées ne prouvent pas les bindings du worker publié. Coût 1,5 crédit disponible, sans achat ni recharge.

## Exploitation à activer sans rejouer les recettes

DB/Auth TEST : export chiffré et contrôle après récupération acquis ; job quotidien 04:11 UTC, premier cycle automatique encore attendu. Storage quotidien et sondes de santé existantes inchangés.

HTTP : réutiliser `scripts/ops/http-monitor.py` dans NONA-OPS privé. Le nouveau workflow ne fait qu’un GET borné de la page publique, sans cookie, clé ou requête Stripe. La version de lancement non publiée produit un état séparé de la disponibilité. Le contrôle manuel initial a reçu 403 alors que le navigateur affiche la page ; cause non établie, aucune panne inférée. Le second essai, avec l’identifiant transparent NonaAvailabilityMonitor/1.0, a reçu HTTP 200 / UP (run 38280257817). `NONA_HTTP_MONITOR_ENABLED=true` a été enregistré ensuite ; cadence horaire à la minute 19 UTC. La première exécution planifiée reste à observer. Ne pas laisser un refus d’accès produire une alerte chaque heure.

Alerte utile : ouvrir le run et lire le code fixe, distinguer accès restreint/limitation/5xx/inconnu, consulter Cloud → Logs → Server logs avec filtre `hostbuddy.operations.v1`, puis rapprocher l’incident de la dernière publication approuvée. Aucun retour arrière, publication, remboursement ou suppression automatique. Après correction, une nouvelle mesure de la sonde concernée suffit. Les détails privés de logs ne doivent pas quitter l’hébergement.

Le canal GitHub du propriétaire a déjà reçu une notification acquise. La notification du premier échec HTTP (run 38279590065) a réellement été constatée dans la boîte GitHub du propriétaire à 18:45 Paris. La correction puis le retour UP sont prouvés, sans provoquer une fausse panne du site. Une chaîne automatique des exceptions hébergées et la surveillance indépendante des cycles manquants restent non attestées. Les tâches Work désactivées ne sont pas réactivées implicitement. Le panneau Cloud donne accès aux journaux serveur ; cet accès ne crée pas à lui seul une alerte.

## Éléments techniques des documents prêts pour validation

Éditeur, statut EI, SIREN/SIRET, tarifs, rôles et commission sont déjà connus : aucune ressaisie demandée. Proposition pour la partie hébergement : service actuel Lovable Cloud, base observée en Irlande ; confirmer l’entité contractuelle depuis la facture/contrat et obtenir les informations de contact de l’hébergeur. Les termes Lovable publiés distinguent Inc. et AB ; ne pas choisir par supposition. Le DPA et la liste contractuelle des sous-traitants/transferts doivent correspondre au service utilisé.

Compléter puis approuver les textes existants : mentions légales, CGV SaaS, confidentialité/cookies et accord de sous-traitance. Pour chaque premier vendeur, intégrer avant la vente son identité et ses conditions de prestation/annulation/remboursement dans les emplacements existants du guide et de sa description de service ; faire valider que l’information précontractuelle est effectivement suffisante pour la prestation. Aucun vendeur fictif, droit de rétractation uniforme ou médiateur inventé. Les 2 % sont prélevés sur le total payé, distincts des frais Stripe ; ne pas ajouter une TVA ou un supplément non décidé.

Préparer une décision de conservation plutôt que lancer une suppression : durées par catégorie, sort des guides à résiliation, demandes RGPD, conservation comptable des abonnements/commandes/commissions, expiration des copies locales et sauvegardes. Les durées proposées doivent être approuvées et correspondre aux mécanismes disponibles. Pas de délai ni SLA promis sans preuve.

## Passage direct à GO

Suite exécutée : transport d’alertes SSR HTTPS préparé et raccordé aux réponses 5xx, désactivé faute de destination autorisée. Attente bornée, aucune donnée voyageur ou exception transmise, pas de retry, plafond par worker et échec de livraison journalisé sans détail privé. Voir `docs/ops/nona-server-alert-preparation.md`. Cinq vérifications ciblées nouvelles passent ; aucune recette acquise rejouée. Le canal effectif et la couverture des fonctions Supabase restent ouverts. Lors de la lecture suivante du workflow HTTP, seuls les deux passages manuels étaient visibles : aucun cycle automatique supplémentaire n’est annoncé comme acquis.

1. Terminer les preuves opérationnelles qui peuvent être acquises en TEST et rendre utilisable la sonde externe.
2. Confirmer uniquement les coordonnées historiques encore actuelles et le régime TVA ; valider les contrats et l’identité de chaque vendeur. Activer Stripe plateforme personnellement, puis faire onboarder un vrai premier gestionnaire Live ; ne pas revenir au KYC sandbox bloqué.
3. Autoriser explicitement la publication/configuration commerciale et Live, avec l’origine, la version et les bindings concrets. Appliquer les configurations préparées, les sauvegardes de la cible commerciale et les destinations de monitoring autorisées.
4. Finition UX/DA sur la référence validée, sans nouvelle fonctionnalité ni refonte des flux financiers ; marque Nona, deux colonnes mobile et Services pleine largeur.
5. Publication après autorisation, validation minimale de ce déploiement et première vente légitime + abonnement réconciliés. Vendeur/organisation/mode/montant/devise/commission 2 %/webhook/commande unique. Aucun achat artificiel Live.

GO n’est pas acquis par un build OK, une sauvegarde TEST ou des variables présentes. Acquis clos : cœur, Billing TEST 7/7, moteur Connect TEST, restauration isolée/147 permissions, mobile 23/23, WebKit 7/7, performance.

Sources officielles utilisées :
- https://docs.lovable.dev/features/email-auth
- https://docs.lovable.dev/features/custom-emails
- https://docs.lovable.dev/features/logs
- https://lovable.dev/terms-of-service

Correction du brouillon légal : hébergement actuel Lovable Cloud/Supabase et base applicative en Irlande renseignés ; entité contractuelle, coordonnées et garanties de transferts restent soumis à validation. Aucun texte présenté comme approuvé.
