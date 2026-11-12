# HostBuddy — pages légales, 8 octobre 2026

> Mise à jour du 9 octobre : le nom commercial retenu est **Nona**. Le présent document conserve l’historique du lot initial ; l’audit courant et les corrections sont décrits dans `docs/nona-legal-audit-2026-10-09.md`.

## État

Les quatre documents de travail sont disponibles dans `/legal`, avec un sommaire à ancres : mentions légales, confidentialité, conditions d’utilisation et d’abonnement, cookies et stockage local. La structure visuelle existante est conservée, ainsi que le lien depuis le footer marketing et l’authentification. Documents français explicitement marqués comme tels, même si l’interface est dans une autre langue. Aucun contrat n’est accepté ni recueilli par cette page ; le badge de préparation et `noindex` restent présents.

Ce lot **prépare** les pages. Il ne déclare pas le lancement juridiquement prêt : l’identité de l’éditeur et plusieurs politiques manquent. Aucune identité, adresse, SIREN, e-mail, hébergeur ou TVA n’a été inventé. Les textes ne promettent pas de durée de suppression, de remboursement, de niveau de disponibilité ou de localisation des données non établis.

## Décisions à finaliser

1. Éditeur : nom légal, forme, SIREN/immatriculation, adresse professionnelle, publication, e-mail et téléphone.
2. Hébergement commercial : entité, adresse et téléphone ; distinguer site, données, médias et authentification. La preview Lovable ne prouve pas le prestataire du domaine final.
3. Fiscalité : HT/TTC et TVA/exonération. Modèle produit préservé : 1 logement gratuit, 2 logements à 9,99 €/mois, +2,99 €/logement ; commission services 2 % séparée des frais Stripe.
4. Clients : projet gestionnaires professionnels. Vérifier les cas de protection impérative, notamment clients assimilés à des consommateurs, avant de fixer rétractation, médiation ou compétence juridictionnelle.
5. Règles contractuelles : dates de résiliation et proratisation conformes au portail existant, impayés, remboursements abonnements/services/commission/frais, fin du contrat et export. Aucun changement du Billing ni nouveau test financier.
6. Données : registre, bases légales, rôles HostBuddy/gestionnaire, durées et purges, sauvegardes, droits et contact. L’expiration du jeton de conversation (30 jours) ne purge pas ses messages ; archivage et effacement distincts.
7. Prestataires : Supabase/Lovable pour la version examinée, Stripe, Google si choisi et autres prestataires effectivement activés ; entités contractuelles, régions et transferts à vérifier. La frontière de traduction automatique est présente mais désactivée (`provider_not_connected`) : ne pas inventer un fournisseur IA de traduction en production.
8. Accord de sous-traitance RGPD (article 28) et annexe prestataires à finaliser avec les mesures, catégories, durées et instructions effectives. Les textes de confidentialité ne remplacent pas cet accord.
9. Inventaire navigateur du domaine commercial : session auth, langue, accès privé conversation, copies hors ligne et caches ; télémétrie de preview Lovable à distinguer de l’usage commercial. Pas de bandeau de consentement fictif ou d’activation de traceurs facultatifs dans ce lot.
10. Révision éditoriale/juridique finale puis traductions du document approuvé. Ne pas présenter ces versions de travail françaises comme six traductions contractuelles validées.

## Références et correspondance au code

- `src/lib/legal-content.ts` : documents et informations de publication manquantes.
- `src/routes/legal.tsx` : rendu public, `noindex`, langue et navigation.
- `src/routes/index.tsx` et `src/routes/auth.tsx` : liens existants.
- `src/integrations/supabase/client.ts` : session persistée ; `previewAuthStorage.ts` : stockage preview/éditeur.
- `src/lib/i18n.tsx` : choix de langue local/session.
- `src/components/guest/GuestActions.tsx`, `drizzle/migrations/0008_guest_conversation_sessions.sql` : accès privé conversation et expiration de 30 jours.
- `src/lib/offline/store.ts`, `src/components/guest/GuideView.tsx` : snapshots médias, copie locale et sauvegarde volontaire.
- `src/lib/translation/service.ts` : traduction automatique désactivée.
- `src/lib/lovable-error-reporting.ts` : télémétrie de preview, inventaire final nécessaire.

Sources officielles consultées le 8 octobre 2026 :

- https://entreprendre.service-public.gouv.fr/vosdroits/F31228 : identification de l’éditeur et CGV.
- https://entreprendre.service-public.gouv.fr/vosdroits/F33527 : contenu des conditions commerciales et distinction des catégories de clients.
- https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence : information des personnes.
- https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre3 : articles 13/14 et droits.
- https://cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/comment-mettre-mon-site-web-en-conformite : exemption de certains stockages nécessaires et préférences attendues.
- https://www.cnil.fr/fr/rgpd-comment-bien-identifier-son-role : responsables et sous-traitants.
- https://www.cnil.fr/fr/node/278 : accord article 28.

## Stripe — chantier suspendu

Activation du compte Connect TEST de la conciergerie classée **BLOQUÉE EXTERNE — diagnostic à examiner par Stripe Support**, sans affirmer un incident Stripe confirmé. La vérification d’identité saisie reste rejetée. Des alternatives documentaires/liveness sont déclarées par Stripe, mais aucun remède API fiable au compte existant, après onboarding hébergé, n’a été établi. Le dossier précis, incluant les identifiants privés et requêtes Stripe, reste dans le rapport remis au titulaire, pas dans ce dépôt public. Ne pas boucler sur le même formulaire, créer un compte, remplacer le rattachement ou invalider les validations financières déjà acquises.
