# Recette du connecteur URL Firecrawl en TEST

## Livraison

Code déployé : `07a27cf`, après `6f18b0e` et `eba6b60`, branche `work/nona-commercial-beta`.

Preview protégée : https://nona-concierge-test-20261020-207n36j9u.vercel.app/

Déploiement `dpl_ATy5fJMhUxcxdJvacUaPNTZTcAF9`, READY, staging ; projet `nona-concierge-test-20261020`, live=false, SSO active. Aucune production, aucun Lovable, aucune dépense. Bêta fermée.

## Ce qui fonctionne réellement

Le formulaire URL existant appelle le nouveau transport Firecrawl sur deux pages NONA explicitement autorisées et fictives :

- https://raw.githubusercontent.com/tpenalba06/HOSTBUDDY/work/nona-commercial-beta/docs/fixtures/nona-villa-test.html
- https://raw.githubusercontent.com/tpenalba06/HOSTBUDDY/work/nona-commercial-beta/docs/fixtures/nona-chalet-test.html

Le prospect n'a pas besoin de compte NONA, de clé Firecrawl ou de saisie complémentaire pour ces deux sources. L'accès à la Preview reste protégé par Vercel. Il s'agit de véritables appels fournisseur, pas de réponses rejouées. Les logements sont fictifs, indiqués dans les noms et les pages sources : ce test ne prouve pas l'import d'annonces Airbnb/Booking.

## Vérification distante depuis la homepage

| Source | Données réellement consultées dans le téléphone | Résultat |
|---|---|---|
| Villa NONA TEST fictive | Titre ; cuisine avec four et lave-vaisselle ; capacité de quatre voyageurs ; arrivée 16:00 ; disponibilité Wi-Fi sans mot de passe ; bus vers la gare. Smart Fill illustratif. | VALIDE pour la recette de source détenue par NONA. |
| Chalet NONA TEST fictional | Titre ; capacité de six voyageurs ; recommandation du musée avec atelier de céramique. | VALIDE pour la recette de source détenue par NONA. |
| Villa à 390 px | Nouvelle génération par URL depuis le champ mobile, puis consultation de Transports. Largeur de contenu 375 px pour viewport 390 px ; aucune inscription. | VALIDE. |

Deux imports ont été effectués successivement sur ordinateur puis un nouvel import villa à 390 px, sans rechargement imposé ni compte prospect. Les premières lectures de pages NONA ont exposé du HTML encodé dans la sortie fournisseur : correction par nettoyage du HTML et du Markdown avant classification. La cuisine est désormais affichée sans balises. Les capacités étiquetées en plusieurs langues passent au même modèle numérique.

L'évaluation n'a réutilisé aucune photo de plateforme. La provenance conserve `photoRights=unconfirmed` et zéro photo copiée ; les illustrations internes restent identifiées. Aucune IA distante de génération ou de structuration n'a été activée : le moteur existant traite le contenu reçu.

## Contrôles techniques

- Liste exacte de deux URL, sans query, sous-domaine voisin ou URL arbitraire ; aucun effet de la source déclarée par le client.
- Limite d'origine, tentatives par minute et concurrence de la homepage conservées. Le compteur de concurrence reste réservé jusqu'à la fin de la requête.
- Activation possible uniquement avec VERCEL_ENV=preview et le projet Supabase TEST attendu.
- Appel sans Authorization, sans clé et sans compte facturable ; pas de fallback payant, crawl, retry, proxy avancé ou actions navigateur.
- Réponses bornées à 2 Mo, requête bornée à 25 secondes, statut cible 200 et source attendue exigés. Les erreurs 402/403/429/500 et enveloppes bloquées ne deviennent pas des livrets réussis.
- Sept tests unitaires nouveaux réussis. Un test réseau opt-in séparé a réalisé les deux appels initiaux (807 et 667 ms) ; résultats dans `validation/nona-firecrawl-live-20261120.json`. Ces résultats initiaux précèdent le correctif HTML, dont la vérification finale est faite dans le navigateur distant.
- `npm run check` final, code 0 : 738 tests Vitest réussis, 3 ignorés dont le test réseau opt-in ; 23 tests Node réussis, 1 ignoré ; intégrité des migrations, lint, TypeScript, build et homepage compilée réussis. Journal local voisin `nona-firecrawl-final-check-20261120.log`.

## Limite commerciale et démarche prête

Le connecteur est préparé et éprouvé sur des URL autorisées. Le critère commercial « une véritable URL Airbnb/Booking produit le livret » reste NON VALIDE. Aucun accès ni licence correspondant n'a été obtenu ; aucune annonce n'a été collectée en contournant ses protections. Les deux pages de recette ne sont pas présentées comme une intégration de plateforme.

Les pistes précises, leurs coûts publiés ou à devis et les demandes de qualification prêtes à envoyer sont dans `nona-url-provider-qualification-20261120.md` : Firecrawl, GIATA pour le contenu hôtelier, Bright Data pour les données Airbnb précollectées. Aucune demande envoyée, aucun contrat accepté ni commande passée. Il faut une réponse écrite sur les droits de collecte, textes, médias, affichage anonyme et correspondance exacte des URL avant de brancher une source réelle.

Le changement préexistant PowerShell reste conservé hors des nouveaux commits. Les contrôles de sécurité bêta ne sont pas déclarés validés par cette recette d'import.
