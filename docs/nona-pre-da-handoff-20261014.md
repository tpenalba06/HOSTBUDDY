# Nona — passage à la DA finale

Base reprise : `cd7932397d2a1cd28640f70eaa8684df595a8dd6`, branche `feat/guest-guide-v2-lot1`. Préparation avant DA, pas GO commercial. Offre intégrale conservée : un logement gratuit, deux à 9,99 €/mois, supplémentaires à 2,99 €, services voyageurs Connect et commission 2 %.

## Terminé dans ce lot

- Premier cycle planifié DB/Auth TEST constaté : 38391941441 Success, archive récupérée et vérification sans SQL réussie. Médias 38393895951, HTTP 38464846204 et santé 38471489450 également réussis. Aucune recette acquise rejouée.
- Trois réglages commerciaux d’alertes enregistrés en preview ; transport raccordable au récepteur existant avec la clé serveur du même backend, sans nouvelle clé ni extraction. Droits du récepteur acquis inchangés. Deux tests nouveaux couvrent le raccordement et le refus des mélanges de cibles.
- Quatre erreurs TypeScript concrètes dans les tests d’alertes corrigées ; procédure d’incident courte préparée. Aucun composant, disposition ou DA modifié.
- Dossier juridique privé complété : mentions, CGV/CGU gestionnaires, CGU voyageurs, confidentialité/cookies, annexe RGPD et conditions des prestations. Coordonnées confirmées conservées hors du dépôt public ; textes non approuvés et non publiés. Réserves obsolètes du brouillon source sur la confirmation de coordonnées corrigées.

## Ce qui dépend de la sortie autorisée

Le serveur publié n’embarque pas encore le nouveau transport. Le lecteur privé commercial attend un accès externe officiel ; aucune notification commerciale bout en bout affirmée. Le premier contrôle natif Lovable du 14 octobre vers 6 h Paris est encore futur à l’heure de cette passe. La sauvegarde externe commerciale reste une dépendance fournisseur acceptée par l’éditeur, pas une tâche de refonte à rouvrir.

E-mails Auth : configuration connue conservée (confirmations activées, expéditeur géré, origines proposées). La réception du premier e-mail légitime sur l’origine finale n’est pas prouvée ; la vérifier seulement à la sortie autorisée. Aucun SMTP payant imposé.

Stripe reste TEST. Configuration Live entièrement spécifiée dans `nona-release-config-20261013.md` : 999/299 centimes, EUR/mois, deux signatures et portées webhook, même origine canonique, file Billing séparée, capacités vendeur actives, commission 2 %. Les noms présents de secrets ne prouvent ni les valeurs Live ni les prix de ce mode. Aucun accès Stripe Live, KYC sandbox rejoué ou paiement réel.

## Interventions humaines, dans l’ordre

1. **Cadre juridique** : approuver les brouillons privés ; faire confirmer TVA/international et obligations de plateforme pertinentes par SIE/conseil ; vérifier les droits Nona. Dans impots.gouv.fr > espace professionnel > Messagerie sécurisée > Écrire > demande au service compétent, exposer activité SaaS et commission, ventes B2B hors France et achats de services étrangers, et demander les obligations TVA/numéro intracommunautaire/DES. Ne pas demander une option TVA involontaire. Les libellés exacts peuvent varier selon l’espace.
2. **Lovable DPA** : obtenir confirmation écrite que le compte Pro couvre les traitements des voyageurs/gestionnaires, avec entité contractante, sous-traitants et transferts. La page publique annonce l’inclusion pour Business/Enterprise, pas une couverture Pro attestée. Aucune montée de plan automatique. L’agent peut préparer la demande ; le titulaire doit l’envoyer ou autoriser explicitement l’envoi.
3. **Stripe titulaire, après mise en ligne comme décidé** : Dashboard > sélecteur de compte > compte Nona réel > compléter le profil entreprise/activation ; fournir lui-même identité, banque et accords. Connect > configuration de plateforme : confirmer le modèle commercial existant. Puis autoriser distinctement Live ; l’agent appliquera prix, signatures et synchronisation préparés sans refaire les anciens tests. Ces menus varient selon les éléments déjà complétés.
4. **Premier vendeur** : dans Nona > Paiements > connecter Stripe, accepter personnellement ses conditions, renseigner pays/entreprise/banque et vérifications dans Stripe. Ses capacités carte et versements doivent être actives. Fournir les conditions de sa première prestation, information avant paiement et confirmation durable ; aucune exemption de rétractation universelle. L’agent fera le rapprochement de sa première vente autorisée.
5. **DA puis sortie** : transmettre la référence visuelle définitive. Après intégration, approuver la release exacte et sa publication (Lovable > Publish), puis l’activation commerciale distincte. Je prendrai en charge les réglages techniques déjà préparés et les contrôles de cette release, sans rerun des recettes closes. Aucun achat de domaine nécessaire si l’origine Lovable actuelle est retenue.

## Limites et critères de fin

Prêt pour recevoir la DA finale ; pas encore autorisé à encaisser. DPA, engagements/activation Stripe, conditions vendeur et publication sont les principaux prérequis humains. Le drainage d’alertes commercial et l’accès aux sauvegardes dépendent encore de capacités fournisseur disponibles ; ne pas les annoncer comme achevés.

PMS et génération IA de traductions restent non connectés : conserver leur statut prévu. Les textes légaux approuvés devront être rendus accessibles avant la souscription/vente et les preuves contractuelles conservées ; la simple rédaction ne démontre pas cette intégration. Aucune nouvelle fonctionnalité secondaire, aucun retest Billing TEST 7/7, Connect, RLS 147, mobile, WebKit, performance ou restauration.

Validation finale : deux tests nouveaux PASS ; TypeScript PASS ; build client/serveur PASS ; lint global zéro erreur (16 avertissements existants). Dix scripts remis au format attendu, équivalence de leur formatage depuis le HEAD vérifiée ; aucune modification logique ni recette relancée. Contrôle ciblé des fichiers suivis : aucune clé privée aux signatures recherchées ; seul .env.example suivi. Ce contrôle n’est pas présenté comme une certification exhaustive de sécurité.
