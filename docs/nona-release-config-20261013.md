# Nona — configuration prête pour autorisation

État : préparation, aucun Live ni déploiement autorisé. Référence produit inchangée : livrets, abonnement et services payants Connect, commission 2 %. Origine proposée sans achat : `https://host-buddy-concierge.lovable.app`. Backend commercial existant proposé : `jzbjpaucgckggumhowns`, distinct du TEST de récupération `mhhtnqfdkyudwyqlmnce`. Ni nouvelle base ni domaine payant nécessaire à cette préparation.

## Lot d’application après autorisation seulement

| Réglage | Valeur/contrôle concret | Destination |
|---|---|---|
| URL/ID Supabase client et serveur | Même cible commerciale ; garder les quatre entrées concordantes et une seule clé publique correspondante | Build public et bindings serveur |
| SUPABASE_SERVICE_ROLE_KEY | Secret du backend commercial, jamais VITE, client ou rapport | Serveur uniquement |
| HOSTBUDDY_APP_URL | Origine canonique approuvée ci-dessus | Serveur |
| HOSTBUDDY_CONNECT_APP_URL | Même origine, sans fallback preview | Serveur |
| STRIPE_SECRET_KEY | Clé du compte plateforme Live autorisé, jamais clé TEST | Serveur |
| STRIPE_PRICE_BASE / EXTRA | Deux prix récurrents EUR mensuels distincts : 999 et 299 centimes ; vérifier produit, mode Live, taxe et affichage final | Serveur |
| STRIPE_LIVE_VERIFIED | `false` pendant toute préparation ; `true` uniquement après validation/autorisation explicite Live | Serveur |
| STRIPE_WEBHOOK_SECRET | Signature de la destination plateforme Live, pas celle de Connect | Serveur |
| STRIPE_CONNECT_WEBHOOK_SECRET | Signature de la destination des comptes connectés Live | Serveur |
| BILLING_SYNC_SECRET | Secret existant protégé, au moins 32 caractères | Serveur + ordonnanceur autorisé |
| Auth | Site URL canonique ; confirmation `/app`, Google `/auth`, récupération `/auth?mode=reset` ; confirmations e-mail conservées | Console backend |
| Alertes | `NONA_OPS_ALERT_TRANSPORT=supabase-commercial-rpc`, URL de `jzbjpaucgckggumhowns` + `/rest/v1/rpc/nona_report_operational_alert`, clé commerciale `NONA_OPS_ALERT_TOKEN`, `NONA_COMMERCIAL_OPS_APPROVED=false` jusqu’à accord | Serveur privé + NONA-OPS |
| Sauvegardes | Configuration distincte commerciale, chiffrement distinct, CA vérifiée, aucun secret TEST réutilisé | NONA-OPS privé |

Le préflight local `scripts/ops/launch-preflight.mjs` est déjà acquis et reste une préparation **non activante**. Ne pas le rejouer tant qu’aucune configuration réelle nouvelle n’a été autorisée. L’origine et le backend proposés réutilisent l’existant ; leur application à une nouvelle publication exige la décision finale de l’éditeur.

## Stripe : parcours réel du premier gestionnaire

Le code existant utilise Accounts v2, dashboard `full`, `fees_collector=stripe`, `losses_collector=stripe`, demande `card_payments` et renvoie vers l’onboarding hébergé Stripe. Le premier propriétaire d’organisation légitime accepte lui-même les conditions de commission `services-2pct-v1` et fournit son pays réel. Son compte Live doit être distinct de la référence sandbox : ne pas recopier les IDs TEST des comptes, clients, abonnements, prix ou sessions dans les bindings Live. Aucune remise à zéro ou migration financière n’est exécutée ici ; conserver l’historique et établir une correspondance propre au mode autorisé avant rattachement réel.

Le gestionnaire saisit lui-même ses informations d’entreprise, représentant, banque et vérifications chez Stripe. Un retour de formulaire n’autorise pas la vente. Exiger les capacités `card_payments=active` et `stripe_balance.payouts=active` pour le premier lancement commercial ; le code interdit déjà Checkout quand la capacité carte n’est pas active. Une demande en attente chez Stripe n’est pas une erreur à contourner, ni une raison de recommencer le KYC initial sandbox.

Paiement de service : Checkout direct sur le compte du vendeur (`stripeAccount`), commission calculée côté serveur, arrondie au centime sur le total payé, distincte des frais Stripe. Aucune modification de ce moteur validé. Les paramètres Accounts v2 de frais et pertes sont structurants : ne pas les remplacer à l’activation.

## Destinations et événements à enregistrer après autorisation

Créer deux destinations Stripe Live séparées **sur la route publique existante** `/api/public/stripe-webhook`, l’une pour la plateforme et l’autre pour les événements des comptes connectés. Même URL possible ; deux portées et signatures distinctes obligatoires. Le handler existant vérifie la signature, la portée `event.account` et la cohérence du mode. Aucun nouveau endpoint n’est nécessaire.

Sélection minimale correspondant au code : plateforme `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`, `checkout.session.completed` ; Connect `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `charge.refunded`. Les capacités Accounts v2 sont relues depuis Stripe lors des opérations existantes ; ne pas annoncer une nouvelle automatisation thin-event non implémentée. Conserver la version API supportée par le moteur acquis ; version de création Accounts v2 actuelle `2025-09-30.preview` à vérifier sur le compte réel autorisé, sans changer le SDK dans ce lot.

Synchronisation Billing : POST `/api/public/billing-sync` avec `Authorization: Bearer` et `BILLING_SYNC_SECRET`, suivant le handler existant. La tâche preview conserve son header `X-HostBuddy-Billing-Mode: test` et ne doit pas être réaffectée silencieusement à Live. Le runner commercial distinct ne doit pas envoyer ce header TEST ; sa préparation n’accorde aucune autorisation d’exécution. Aucune activation ici.

Le runner `scripts/run-commercial-billing-sync.mjs` et le workflow inerte `docs/ops/nona-commercial.workflow.yml` sont prêts. Ce dernier se destine à NONA-OPS privé sous `commercial.yml`, environnement `nona-commercial` protégé, après approbation du SHA exact `NONA_RELEASE_REF` et de la cible. Aucun de ses secrets ou flags n’est installé aujourd’hui. Les horaires sont commentés, le bouton manuel n’est pas installé. Le fallback Billing partage la cadence horaire des alertes ; les opérations de logement tentent déjà la réconciliation immédiate. Aucun délai commercial de traitement n’est promis.

Pour rester dans le gratuit lors du passage commercial, remplacer les cadences TEST closes par le job commercial, en préservant la sonde HTTP ; ne pas ajouter une troisième série horaire. Cela ne supprime ni les données ni les preuves TEST. Faire cette transition seulement après le premier cycle TEST à constater et les premières preuves commerciales autorisées. Le budget zéro reste bloquant ; l’agent ne le relève jamais. La surveillance indépendante de GitHub exige un observateur extérieur effectivement accessible : aucune tâche Work désactivée n’a été réactivée et aucun nouvel accès au dépôt privé n’a été accordé ici.

## Validation minimale de sortie, aucun ancien scénario rejoué

Après finition puis publication expressément autorisée : constater la révision publiée et les bindings de cette cible, un email Auth légitime reçu avec retour canonique, les signatures des deux destinations Live, puis le premier abonnement et la première vente réels autorisés. Rapprocher mode, vendeur/organisation, montant/devise, commission, événement webhook, ledger et commande unique. Pas d’achat artificiel, de remboursement réel d’essai ni de reprise générale Billing/Connect/mobile.

Source technique primaire complémentaire : https://docs.stripe.com/connect/accounts-v2/connected-account-configuration . Les fichiers du dépôt déterminent les routes et événements réellement implémentés.
