# Corrections webhook et Connect — 5 octobre 2026

## Preuve réseau avant correction
Checkout sandbox réel payé 1298 cents ; abonnement active ; archivage/restauration d'un logement fictif : 999 puis 1298. Livraison webhook preview : 401 avant code applicatif. Traitement local de vrais événements signés : 200, ne prouve pas livraison Stripe. Connect refusé : namespace Accounts v2 exige preview pour cette sandbox ; ensuite pays manquant.

## Corrections
- Ajout `/api/public/stripe-webhook`, route publique du preview. Même handler que `/api/stripe-webhook`, conservée pour compatibilité. Signature vérifiée avec secret serveur, corps UTF-8 brut, limite 512000 octets, aucun événement traité si invalide ; erreur traitement 503 pour retry Stripe.
- Connect : pays légal explicitement saisi, jamais déduit de la langue ou du logement. Code deux lettres validé avant écritures. Libellé et aide dans les six langues. Pas de changement DA.
- Accounts v2 et AccountLinks utilisent la version `2025-09-30.preview` par requête, dont le diagnostic sandbox a confirmé l'accès au namespace. Billing garde la version du SDK installé (`2026-09-30.endive`). Cette compatibilité Connect doit être rejouée réseau ; ce pin ne prouve PAS un onboarding fini ni un compte Live autorisé.

## Validation locale
npm run check : 203 tests / 39 fichiers, lint 0 erreur, TypeScript et build OK. Six nouveaux tests : signature obligatoire/invalide, corps borné, UTF-8/signature et erreur sûre, pays obligatoire sans mutation, payload pays/version Connect et liens.

## Validation externe restante
Pointer uniquement les deux endpoints sandbox sur la route publique (mêmes secrets, aucun secret frontend). Vérifier webhook Stripe livré, état de base et déduplication. Rejouer Connect avec pays fictif FR. Ne pas accepter d'accord légal ni contourner OTP/captcha. Si bloqué, conserver preuve exacte et continuer vidéo offline/imports.

Rollback : revenir au commit précédent ; remonter URLs sandbox sur l'ancienne route uniquement si nécessaire. Aucun schéma ni donnée réelle changé. Stripe Live et production restent interdits.
