# NONA TEST — reprise du 23 octobre 2026

## Résultat vérifié

- Source consolidée propre : a90b2c3ca286e3614168c831596564fb4bb6b6ea.
- Bundle `output/nona-beta-consolidated-final-20261022.bundle` vérifié : historique complet, six références.
- Nouveau déploiement : dpl_C4za1PrsjHcRzCKCx3WmQM678T9p.
- URL : https://nona-concierge-test-20261020-lsz2i7ggk.vercel.app/
- Projet prj_JNddG5i5NkQyvQI83Blh7X02GVzV, équipe team_7ootXJgYQeic3jxHpiRxpXN2.
- Vercel confirme READY, staging/Preview, live=false, SSO actif.
- Paquet transféré : output/nona-beta-paquet-TEST-20261022.
- Manifeste actualisé : output/nona-consolidation-tools-20261022/deploy-manifest-resumed.json.
- Gros fichiers lus par fragments de 393216 octets : la sortie de commande est tronquée vers 1 Mio, même si max_output_tokens est supérieur. Valider la longueur base64 avant envoi.

## Vérification réalisée, limites

Le serveur compilé du paquet passe cinq refus (origine étrangère, langue invalide, méthode incorrecte, corps invalide, environnement production). Le parcours guidé fictif arrive à 7500 centimes, sans soumission et sans appel modèle, sur un créneau proposé. Preuve locale : output/nona-consolidation-tools-20261022/resume-guided-verification.json.

Ce n'est pas une recette Gemma ni une recette HTTP hébergée. Le paquet hébergé est le guide fictif Villa Mare : il ne contient pas de session gestionnaire ni de boutique publiée réelle.

## Blocages concrets

- Le fetch authentifié Vercel refuse l'accès : 403 forbidden, étape read_protection_bypass, endpoint /v2/deployments/dpl_C4za1PrsjHcRzCKCx3WmQM678T9p/aliases. L'intégration demande de réautoriser ce projet et cette équipe. Aucun changement du SSO effectué.
- Aucun navigateur disponible dans l'inventaire CUA.
- Le coffre DPAPI est lisible et la clé Ollama existe. Le fetch local vers ollama.com échoue ENOTFOUND ; aucun secret affiché.
- L'API officielle GET https://ollama.com/api/balance existe. Elle expose les crédits inclus/achetés, mais pas une preuve complète des réglages de facturation automatique ni de l'éligibilité Gemma Free.
- Une route diagnostic GET /api/preflight a été ajoutée au seul paquet Preview protégé. Lecture seule du solde, aucune génération ni mutation, sortie filtrée sans clé ni identité. Elle exige VERCEL_ENV=preview, scope test et URL Supabase TEST exacte. Sa réponse n'a pas été accessible à cause du 403 Vercel. Retirer cette route après diagnostic.

## Registres TEST relus

Projet mhhtnqfdkyudwyqlmnce uniquement. Autorisation concierge-test-20261015 : enabled=false, expires_at=2026-10-20T17:21:38.308Z, reserved_micros=1260000, cap_micros=1380000. 63 lignes nona_ai_usage, 63 observations scope=test. Politique nona_cloud_policy disabled, monthly_cap_micros=20000000. Aucune mutation SQL, aucun renouvellement et aucun appel modèle.

## Suite

1. Rétablir l'accès authentifié Vercel au projet et à l'équipe existants.
2. Vérifier l'HTTP de l'aperçu et le diagnostic solde sans génération.
3. Vérifier réellement plan Free, éligibilité Gemma, absence de facturation automatique. Ne pas réutiliser une attestation ancienne.
4. Seulement ensuite renouveler une fenêtre bornée, compteurs cumulatifs conservés, tester les cas prévus et refermer.
5. Préparer le gestionnaire/logement TEST et vérifier un vrai service publié avant d'annoncer une bêta ouverte.

Production, paiements réels et budget mensuel restent désactivés. La bêta n'est pas ouverte.
