# NONA — vraie IA dans le guide hébergé TEST

**Le vrai chat cloud fonctionne désormais dans le guide hébergé, indépendamment de l'ordinateur.** Le navigateur autorisé a ouvert le guide, cliqué la mascotte, envoyé les messages et affiché les réponses. Aucun replay ni mock du fournisseur. Le catalogue Villa Mare est explicitement fictif, comme pendant les recettes précédentes : pas un logement client.

Déploiement final : `dpl_7NuVUjgAy6RE7zMReUdU3gzPiYLb`, cible **staging**, état READY, `https://nona-concierge-test-20261020-g4a1dn92x.vercel.app/`. Lien temporaire d'accès transmis dans la conversation, pas enregistré dans GitHub. Cadre mobile : `/mobile.html` sur ce même site. La protection SSO est conservée.

## Résultats réels

- **14 générations** : dix textes acceptés en `mode=ai`, trois textes remplacés par la voix guidée et une dernière tentative Wi-Fi de mesure locale `uncertain`, également guidée. Une autre étape voyageur a basculé avant génération. Les rafraîchissements de devis et les protections source ne génèrent rien. Pas de retry automatique.
- Les **six langues** ont chacune au moins une réponse générée, acceptée et affichée : FR, EN, ES, DE, IT, PT. Recette exploratoire, pas un score statistique de qualité.
- Petit-déjeuner sur ordinateur : quantité trois, horaire proposé 10:30, formule Classique, récapitulatif et formulaire à **75.00 EUR**. Nom/contact vides, conditions décochées, bouton de confirmation désactivé. **Aucun envoi ni paiement.**
- Le retour du massage au petit-déjeuner en anglais produit aussi le devis serveur de 75 EUR et rappelle que rien n'a été envoyé.
- Une seconde conversation en document mobile prépare le même devis en français ; italien et portugais confirment ensuite la préparation sans envoi.
- Conversation principale de treize messages voyageurs, changements de sujet et de langue. L'historique transmis reste borné aux dix derniers messages structurés : pas de mémoire illimitée.
- Code de boîte à clés inconnu et allergènes : refus honnête sans IA ni fausse urgence. Wi-Fi : carte exacte du guide fictif, sans valeur inventée ; le texte fournisseur incertain n'est pas réutilisé.

Exemples affichés : « Bienvenue chez toi ! Pose tes valises et détends-toi, je m'occupe de tout. Est-ce que tu as besoin d'un petit quelque chose pour te remettre de tes émotions ? » ; « Of course, let's get that delicious breakfast back on the menu! Please review the summary below; remember that nothing has been sent yet. »

Le transport TEST journalise identifiant, langue, mode, tokens/coût/latence disponibles, étape et devis, sans texte voyageur, corps du guide, contact, reçu ou secret. Les identifiants sont corrélés aux observations durables Supabase et au compteur fournisseur. Voir `docs/evidence/nona-hosted-live-browser-20261020.json`.

## Mobile et captures

L'override du navigateur n'a pas changé sa taille réelle : le premier document mesurait 1280 × 720, donc ces vues ne sont pas comptées comme mobiles. L'alternative utilisée est une iframe du même guide hébergé, **390 × 844 pixels CSS**. Document mesuré : **375 × 844**, quinze pixels étant pris par la barre de défilement. `scrollWidth=clientWidth=375` : pas de débordement horizontal. Le chat occupe la largeur mobile, avec en-tête, formulaire à 75 EUR et champ de saisie accessibles.

Les captures réelles ont été affichées dans la conversation. Aucun nouveau PNG téléchargeable n'est prétendu sauvegardé. Ce n'est ni un téléphone physique ni un test tactile, clavier logiciel ou Safari. Aucun nouveau run GitHub Actions n'est annoncé : le navigateur autorisé atteint désormais l'hébergement distant et aucun lien privé n'a été publié dans le runner public. Les captures GitHub antérieures restent distinctes et guidées.

## Coût et latence

Treize tentatives mesurées : **28 062 tokens entrants, 1 646 sortants**, estimation partielle cache inclus **0,00357044 USD**. La quatorzième a des tokens et un coût locaux inconnus : aucune valeur ne lui est inventée.

Tableau Ollama authentifié : quatorze nouvelles lignes, somme de leurs montants individuellement arrondis **0,00399 USD**, couverts par Free ; **nouveau paiement 0 USD**, solde acheté zéro, recharge automatique Off. Consommation Free affichée 0,6 %. Compteur : 62 Gemma + une GPT historique = **63 appels cumulés**. Cumul des montants affichés du chantier : environ **0,01420 USD**, financés par Free.

Latence fournisseur sur les treize réponses mesurées : min. **581 ms**, médiane **884 ms**, max. **2 577 ms**. La tentative incertaine porte 650 ms. Cela exclut les contrôles d'admission, la base et le rendu navigateur ; aucune médiane de temps navigateur complet n'est revendiquée.

## Sécurité et limites

Transfert des deux clés effectué après accord explicite, uniquement dans les variables privées **Preview** du nouveau projet TEST. Recherche des valeurs réelles dans tous les fichiers du paquet : aucun secret incorporé. Aucun secret dans le frontend, GitHub, un runner ou un rapport.

Vérifications HTTP réelles : source serveur et `.env` en 404 ; commande 405 ; slug étranger 400 ; origine étrangère 403. Aucun de ces contrôles ne génère d'appel IA. Aucun endpoint de paiement ou d'envoi de commande dans ce laboratoire.

Une propriété fictive déjà publiée, `Nona navigateur TEST`, a été réutilisée pour la comptabilisation, sans création de logement ni modification des services. Les triggers de facturation ont été inspectés avant de renoncer à créer une nouvelle propriété. Aucun événement Stripe provoqué. Autres travaux UX intacts.

Une première tentative Vercel a été classée `production` malgré la cible `preview` demandée : immédiatement annulée, état CANCELED confirmé, avant activation IA. Les suivantes emploient `staging`, vérifié dans leurs résultats. La production NONA existante n'a pas été modifiée. Cet incident n'est pas présenté comme un déploiement Preview réussi.

La fenêtre expire **le 20 octobre à 19 h 21 min 38 s Paris** (`2026-10-20T17:21:38.308Z`). Revue fournisseur et autorisation SQL expirent sans renouvellement automatique. Plafond resserré à **1 380 000 micro-EUR**, sans remise à zéro du compteur initial 980 000 : au plus vingt nouvelles tentatives de 20 000 micro-EUR de réserve. Après quatorze tentatives : réserve **1 260 000**, au plus six tentatives restantes avant plafond/expiration, sous les autres quotas. Ces réserves ne sont pas des dépenses.

Le plafond mensuel de 20 EUR reste désactivé. Les URL continuent en guidé après expiration. Cette fenêtre n'autorise pas une IA permanente.

**Clôture vérifiée après expiration :** autorisation explicitement désactivée, 63 tentatives et 63 observations cumulées, réserve 1 260 000 sur 1 380 000 micro-EUR, politique mensuelle désactivée. Une nouvelle réservation est refusée (`false`). Les six tentatives non utilisées ne sont pas renouvelées automatiquement.

## Limites de qualité et état bêta

Trois générations ont été remplacées par le guidé : demande implicite de détente après un petit-déjeuner prêt, massage explicite et conversation sociale allemande. La première a renvoyé un texte de préparation du petit-déjeuner hors sujet. Le massage a sélectionné la bonne carte et demandé l'heure. Une demande allemande explicite de récapitulatif a ensuite réussi en IA. La dernière réponse Wi-Fi a une mesure incertaine ; la carte source est correcte, la réserve reste retenue, sans retry.

Ces défauts restent à corriger avant de qualifier la bêta de prête. Haiku 5.5 demeure candidat : aucun essai gratuit ou déjà financé établi ici, aucun classement inventé.

Non-régression finale rejouée : **613 tests Vitest réussis, deux ignorés**, 97 fichiers réussis et un ignoré. TypeScript et compilation précédemment réussis. Cette reprise ajoute seulement un diagnostic TEST sans données voyageur et le cadre mobile au script de paquet. Lint ciblé réussi. Tests natifs Node et GitHub Actions historiques non prétendus relancés ici.

**État : vrai chat IA hébergé démontré sur ordinateur et document mobile ; ouverture temporaire bornée ; qualité à améliorer et autorisation durable absente pour une bêta permanente.**
