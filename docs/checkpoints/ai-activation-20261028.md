# NONA — conversation réelle et branchement aperçu Lovable, 28 octobre 2026 soir

## Résultat exact

Le branchement du chat de démonstration de l’aperçu privé Lovable est ajouté. Il n’est pas activé dans le runtime Lovable : les secrets TEST et leurs autorisations privées n’y sont pas configurés, et l’éditeur demande une connexion. Aucun déploiement public, aucune dépense, aucun agent Lovable ni crédit Lovable utilisé. La bêta reste non ouverte.

La recette réelle Gemma supplémentaire explicitement autorisée a consommé exactement 20 appels dans la fenêtre 20:02:11.342829Z–20:17:11.342829Z, puis a été refermée explicitement. Huit appels de diagnostic local et douze depuis le vrai composant de chat dans le navigateur local, fournisseur Ollama réel sans mock ni replay. Cela n’est PAS une preuve de conversation effectuée depuis l’aperçu Lovable hébergé.

Quinze réponses acceptées, cinq remplacées. Les six langues ont reçu une réponse IA réellement acceptée, y compris dans le navigateur : FR, EN, ES, IT, PT et DE. Ce petit échantillon n’établit pas une qualité générale suffisante pour un service continu. Les trois derniers appels sur choix de formule, récapitulatif et changement de sujet sont retombés en mode guidé ; les brouillons et sources serveur sont conservés. Le dernier changement de sujet a nextStep=null et quote=null, mais le repli est peu conversationnel. L’activation continue demeure non validée.

## Corrections et architecture

- Le chat demo de NonaConcierge court-circuitait volontairement tous les appels cloud. Il peut désormais appeler un endpoint de recette sur le seul hostname exact `id-preview--ad0b09fe-b134-491b-8601-9d64d6d27b86.lovable.app`.
- L’endpoint refuse domaines publiés, lookalikes, origines étrangères, HTTP, contexte Vercel production et slug libre. Le catalogue Villa Mare fictif est construit côté serveur ; aucun guide du navigateur n’est accepté. Aucune route commande/paiement n’est ajoutée.
- Clé Supabase TEST et secret de session séparés de ceux du produit. URL Supabase TEST épinglée ; aucune lecture ou mutation du projet produit. Sans configuration privée TEST, retour guidé sans accès réseau. Aucun adaptateur mensuel ni Gateway choisi par défaut.
- Le moteur existant conserve revue financière datée, expiration 15 minutes, réserve distribuée, quotas et zéro retry. L’activation de l’aperçu exige deux gates privés explicites. Les valeurs restent vides dans `.env.example`.
- Un rejet allemand était dû à une promesse de massage « am Pool », malgré une absence de localisation vérifiée. Les protections l’ont correctement bloquée. Les consignes excluent désormais explicitement cette confusion et toute organisation effective d’un service ; nouvel appel allemand accepté sans cette promesse. Version de voix `nona-voice-2026-10-28.1`.
- Les rejets structurels du fournisseur n’étaient pas distingués. Un diagnostic serveur borné différencie désormais enveloppe invalide et arguments invalides, sans prose, prompts, erreurs fournisseur ou valeurs sensibles. Acceptation et comptabilisation inchangées ; test de non-divulgation ajouté. Il n’a pas été réévalué avec un nouvel appel réel après épuisement de l’enveloppe.

## Preuves de parcours

Conversation FR libre et tutoiement, détente implicite, changement de sujet massage vers Wi-Fi avec carte exacte du serveur : réponses IA acceptées. Code de boîte à clés inconnu : aucun code inventé, zéro appel. Allergènes : aucune garantie ni fausse urgence, zéro appel. Historique prolongé multilingue : réponses acceptées dans les six langues.

Petit-déjeuner fictif : trois personnes, créneau fourni par le serveur, option Classique, brouillon serveur **75 EUR**. Aucun nom ou contact saisi, aucune case conditions cochée, aucun clic de confirmation, aucune commande ou paiement. Passage final sur mobile 390×844 et changement de sujet conservant le brouillon sans devis actif. Les captures montrent des données entièrement synthétiques.

## Compteurs et coût

Avant : crédits inclus 2.48019 USD ; après : 2.47491 USD. Débit authentifié : **0.00528 USD de crédits inclus**, distinct de l’estimation instrumentée 0.0051789 USD. Crédit acheté zéro, auto-reload Off avant et après, aucun paiement. Requêtes Gemma sur le compte : 82 vers 102.

État final Supabase TEST : enabled=false, **103 réservations et 103 observations**, réserve=cap=2060000 micro-EUR ; aucun reset. Réservation supplémentaire réellement refusée. Politique mensuelle désactivée. Serveur de recette local fermé. Le flag privé Vercel de la précédente Preview n’a pas été rouvert ; aucun nouveau déploiement Vercel effectué dans cette reprise.

## Vérification et accès restant

Vitest final : 674 réussis, deux ignorés. TypeScript, lint des fichiers modifiés et build complet TEST réussis. Tests de sécurité ajoutés pour le domaine aperçu, l’origine et l’absence d’utilisation de clés produit. Les migrations, droits Supabase et workflows sont inchangés.

La configuration des secrets Lovable n’est pas disponible dans le connecteur. L’éditeur privé demande une connexion ; la tentative de connexion via GitHub a été refusée par la validation automatique faute d’autorisation explicite de ce parcours externe. Aucune tentative indirecte, aucune nouvelle permission accordée. Une autorisation de connexion Lovable via GitHub (ou connexion réalisée par l’utilisateur) est nécessaire pour poursuivre l’accès aux réglages privés. Ne pas demander de clé en clair dans le chat. Une activation continue exige également une autorisation bornée distincte ; les 20 appels de cette recette sont intégralement consommés.

Audit après build : 139 fichiers frontend inspectés, zéro correspondance avec les clés privées du coffre et zéro identifiant de projet de production.

La première exportation AX locale était un diff sans contenu financier complet ; elle est conservée telle quelle. Les faits du précontrôle réellement lus dans le navigateur sont transcrits explicitement dans preflight-observation.json, sans présenter cette transcription comme une capture brute. Le solde avant et après provient des réponses JSON authentifiées conservées.
