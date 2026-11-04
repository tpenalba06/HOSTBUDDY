# NONA — reprise Lovable du 3 novembre 2026

## État vérifié

Le blocage réseau préalable à Gemma est corrigé dans l’aperçu privé Lovable. La conversation Gemma réelle après ce correctif reste NON VALIDÉE : aucune nouvelle génération n’a été exécutée le 3 novembre. La bêta privée reste NON OUVERTE. Aucun nouveau déploiement Vercel ni publication Lovable en production.

Projet Lovable : `ad0b09fe-b134-491b-8601-9d64d6d27b86`, dépôt connecté `tpenalba06/HOSTBUDDY`, branche `feat/guest-guide-v2-lot1`. Correctif réseau : `69be304`. Aperçu : https://id-preview--ad0b09fe-b134-491b-8601-9d64d6d27b86.lovable.app/demo?preview=guide . Éditeur : https://lovable.dev/projects/ad0b09fe-b134-491b-8601-9d64d6d27b86 . Les modifications demeurent non publiées.

L’ancien déploiement TEST Vercel https://nona-concierge-test-20261020-q07nj3h1p.vercel.app/ n’a pas été recetté à nouveau dans cette reprise ; sa validation complète reste en attente. Ne pas assimiler le succès du catalogue Lovable à la validation du déploiement ou de Gemma de bout en bout.

## Cause et correction

Un diagnostic GET strictement limité au domaine privé du projet vérifie le catalogue public Ollama, sans clé, génération, accès base ou modification du registre. Avant correction : `catalogue-redirect-option-rejected`, status=null. Le runtime Workers refuse `redirect: "error"` avant d’envoyer la requête. Cette limitation est également documentée par Cloudflare : https://developers.cloudflare.com/workers/runtime-apis/request/ .

Les transports Ollama TEST et Supabase TEST utilisent désormais `redirect: "manual"`. Ils ne suivent aucune redirection et ne transfèrent donc pas de clé à sa destination. Le catalogue et les réponses fournisseur non 2xx sont rejetés. Un test spécifique assure qu’un catalogue 302 n’effectue aucune réservation. L’instruction de non-cache du catalogue est portée par un en-tête compatible.

Preuve réelle après compilation de l’aperçu : GET `/api/public/concierge-preview` → `modelCalls=0`, `ledgerMutations=0`, catalogue status=200, compatible=true, reason=catalogue-ready, revision=health-v3. Ce résultat établit uniquement l’accès au catalogue, pas l’inférence ou la qualité conversationnelle.

## Champ de texte

Dans le vrai chat Lovable, sur ordinateur puis en viewport 390×844 : saisir, cliquer le titre NONA, recliquer le champ et continuer à écrire fonctionne. `document.activeElement` désigne le champ et les deux fragments saisis sont présents. Aucun message n’a été envoyé pour ce contrôle. Captures locales : `output/nona-lovable-resume-20261103/composer-desktop.jpg` et `composer-mobile.jpg` dans le workspace parent.

## Fermeture et consommation

La fenêtre précédente a expiré le 28 octobre à 21:07:48.338687 UTC. Son booléen était resté true ; il a été explicitement fermé le 3 novembre. Les deux interrupteurs privés Lovable ont été remplacés par des valeurs fermées : TEST_ENABLE=closed-after-recipe et PREVIEW_ENABLE=closed-pending-private-validation. La revue de gratuité est expirée. Aucun renouvellement implicite.

Supabase TEST `mhhtnqfdkyudwyqlmnce`, autorisation `concierge-test-20261015` : enabled=false, reserved_micros=2120000, cap_micros=2260000. Aucune remise à zéro. Une réservation supplémentaire exécutée après fermeture retourne false. Observations TEST cumulatives : 106. Politique mensuelle : enabled=false, plafond préparé 20000000 micro-EUR inchangé.

La dernière fenêtre a réellement produit trois réponses FR acceptées en diagnostic local le 28 octobre ; ce ne sont pas des conversations Lovable hébergées. Entrée totale 6870 tokens, sortie 341 ; latences fournisseur instrumentées 831, 1252 et 696 ms. Estimation totale 0.00083324 USD, à distinguer du débit de compte.

État Ollama authentifié relu le 3 novembre : crédits achetés 0 USD, Auto-reload Off, usage gratuit 1%, Gemma éligible, compteur Gemma 105. Solde inclus authentifié : 2.47406 USD contre 2.47491 avant ces trois appels, soit 0.00085 USD de crédits inclus consommés. Aucun paiement ajouté ou effectué. La recette précédente des six langues reste historique ; elles n’ont pas été revalidées sur Lovable après le correctif.

## Vérifications et suite

Vitest : 678 réussis, 2 ignorés. Node : 19 réussis, 1 ignoré. TypeScript, lint ciblé et build complet TEST réussis. Audit de 185 fichiers frontend : aucune correspondance avec les deux clés privées du coffre TEST ni l’identifiant de projet de production. Sources synchronisées, DA et moteur métier conservés ; aucun agent ou crédit Lovable utilisé.

Preuves complémentaires conservées hors dépôt dans `output/nona-lovable-resume-20261103` : health-before/after, solde, usage anonymisé, tests, build, audit. Les anciennes sauvegardes et données non publiées sont conservées.

Prochaine action nécessitant accord : nouvelle fenêtre de recette réelle plafonnée, avec recontrôle gratuité et auto-recharge, sans paiement. L’ancienne fenêtre ne doit pas être réouverte ou prolongée. Pour 20 nouveaux appels, le cap cumulatif serait 2520000 micro-EUR à partir de la réserve actuelle, sans reset, sous réserve des quotas restants. Fermer ensuite explicitement base et interrupteurs. Validation gestionnaire TEST et destinataires autorisés restent à établir avant toute invitation externe ; aucun destinataire inventé.
