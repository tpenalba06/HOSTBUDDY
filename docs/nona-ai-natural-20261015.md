# NONA : génération conversationnelle et laboratoire Work

Base préservée : 036a5ac, branche feat/guest-guide-v2-lot1. Aucun appel Lovable ni modification Stripe/services/types métier. Seule la migration de budget 0024 a été appliquée sur TEST, après vérification de son absence ; elle reste désactivée.

## Réalisé

Le modèle produit désormais dialogue.text librement, sans vocabulaire fermé ni ajout à un texte guidé. La personnalité centrale est versionnée .3. L'historique distingue les deux interlocuteurs ; le contexte, les brouillons et leurs corrections sont conservés. Le modèle choisit une question parmi les champs réellement manquants ; le serveur refuse une fausse étape « prêt ». Les valeurs affichées proviennent des cartes serveur existantes. Les sorties structurées ne contiennent aucune action de réservation ni paiement. Les situations urgentes et suivis privés restent dans le circuit déterministe explicite.

L'ancien mode guidé reste un repli identifié. La question générique « gourmands » a été retirée pour éviter les massages gourmands. Le mode IA utilise les phrases générées, pas de nouveaux fragments.

Le laboratoire http://127.0.0.1:4181 est un serveur local séparé. Il ne monte aucune route applicative de réservation ou de paiement. Clés chiffrées avec DPAPI CurrentUser dans ../nona-private/credentials.dpapi, hors dépôt. Aucun stockage navigateur ni retour des clés. Host local, origine exacte, session HttpOnly SameSite Strict, CSP, corps borné. Sa configuration ne peut pas activer la consommation.

## Accès : deux champs

Vercel Dashboard → AI Gateway → API Keys → Create key, nom NONA-Work-test. Budget additionnel conseillé 1 USD, refresh none ; ce budget fournisseur reste une protection complémentaire, pas une garantie dure. Aucun achat/rechargement.
Supabase TEST mhhtnqfdkyudwyqlmnce → Settings → API Keys → Secret keys (ou legacy service_role).
Coller uniquement dans les champs masqués du laboratoire, puis Enregistrer les accès chiffrés. Ne jamais coller ces clés dans le chat.

Work effectue ensuite des lectures : accès Gateway, guide publié via get_public_guide, état du registre 0024. Avant toute application SQL, vérifier l'inventaire et les objets réellement présents sur TEST. Le backend commercial jzbjpaucgckggumhowns reste exclu.

## Budget et recette réelle

Aucun accès exploitable présent lors du contrôle de l'environnement. L’accès PostgreSQL TEST existant dans NONA-OPS a permis une vérification réelle sans récupérer de secret. Le run 38673009523 a confirmé les trois objets absents. Le run 38673138920 a installé 0024 sur TEST : enabled=false, cap_micros=4000000, reserved_micros=0 ; les tentatives par défaut et l’accès anonyme sont refusés. Aucun accès au backend commercial. Aucun appel d'inférence effectué, consommation externe réelle : 0 EUR. Le plafond fournisseur est souple ; il ne doit pas être présenté comme une garantie de 5 EUR.
L'autorisation interne est cumulative, partagée, atomique, non remboursée en cas de doute, plafond 4 EUR, réservation 0,02 EUR avant chaque tentative. La vérification de l'enveloppe (limites tokens, prix actuels, change/frais, routage sans reprise payante ni outil, confidentialité) reste indispensable avant activation ; aucun bouton ne contourne cette vérification. Ne pas simplement renseigner le marqueur d'environnement pour forcer le démarrage.
Modèle configuré : anthropic/claude-haiku-5.5 via AI Gateway. Catalogue public relu sans inférence : 0,10 USD/M tokens entrée ; 0,50 USD/M sortie. Revalidation automatique des tarifs avant chaque réservation ; 800 tokens sortie, 12 000 octets contexte, aucun retry SDK.

## Validation effective

71 tests ciblés réussis (11 fichiers), TypeScript OK, build OK, lint 0 erreur / 23 avertissements préexistants. Deux tests Node supplémentaires réussis : coffre DPAPI et isolation HTTP (session, origine, absence d'endpoint commandes, IA fermée sans accès).
Ces tests utilisent des fournisseurs simulés, ils ne prouvent ni naturel ni qualité du modèle réel.
Le lancement automatique du navigateur a échoué avec spawn UNKNOWN ; la recette visuelle 360/390/430/desktop de ce nouveau laboratoire n'est donc pas validée. HTTP 200 et formulaire servis vérifiés.
Les filtres de prose sont une défense complémentaire, pas une preuve sémantique d'absence d'hallucination. La recette du vrai modèle reste nécessaire avant usage commercial.

## Recette réelle à exécuter après accès et budget vérifiés

Comparer chaque séquence dans deux conversations vierges, IA réelle puis guidé. Ne jamais appeler une réponse guidée un résultat IA. Noter naturel, tutoiement, humour contextuel, questions, répétitions, sources et latence ; conserver les échanges seulement avec données synthétiques de TEST. Pas de paiement ni réservation.

1. Petit-déjeuner → trois → demain → vers neuf heures → formule.
2. Petit-déjeuner avec faute « ptit déj ».
3. « J'ai faim », préciser matin.
4. Petit-déjeuner, correction du nombre.
5. Petit-déjeuner, changement de date.
6. Petit-déjeuner, heure non proposée.
7. Massage vague → date → formule.
8. Massage pour un couple.
9. Massage demain après-midi.
10. Massage puis petit-déjeuner.
11. Retour au massage après autre sujet.
12. Cadeau pour sa copine, besoin implicite.
13. Cadeau sans service correspondant.
14. Arrivée anticipée → heure.
15. Arrivée anticipée absente du catalogue.
16. Wi-Fi publié, valeur exacte dans carte.
17. Wi-Fi absent, aucune invention.
18. Restaurant italien référencé.
19. Restaurant italien absent.
20. Demande de réservation restaurant : aucune action promise.
21. Consigne de logement publiée, source exacte.
22. Information de logement absente.
23. Voyageur enfermé dehors : circuit sérieux explicite.
24. Danger immédiat : contact/urgence sans humour.
25. Injection dans message.
26. Injection dans description de service TEST.
27. Anglais avec message en français.
28. Espagnol, correction d'heure.
29. Italien, cadeau ambigu.
30. Allemand, changement de sujet et retour au service.
31. Portugais, connexion Wi-Fi.
32. Répétition de questions et réponse hors sujet.

Les essais de concurrence/idempotence/plafond du registre sont techniques et séparés ; ne pas multiplier les appels payants pour simuler une charge.
