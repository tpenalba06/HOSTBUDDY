# NONA — intégration de la DA, 17 octobre 2026

## Source et périmètre

La capture initiale a été analysée, puis le dossier `NONA-charte-graphique-2026-10-17.zip` reçu pendant l’intégration. Sa référence **A** et ses codes normalisés priment sur l’expérimentation B avec prix et boutons Réserver en accueil. Le document original est conservé dans `nona-charte-20261017.md`. Aucun appel au service Lovable, aucune image de remplacement générée, aucun achat, aucune publication.

Les 93 fichiers du travail précédent ont été conservés dans le commit local **95d75d2**, sur la nouvelle branche `design/nona-da-20261017`. L’historique existant n’a pas été réécrit ; la branche connectée n’a pas été poussée.

## Ce qui est intégré

- Crème `#FCF9F2`, bordeaux `#780E2F`, cacao `#210804`, pêche `#F8E3D4`, contours pratiques cacao à 80 %. Les anciens accents ne pilotent plus ces écrans.
- **Lora** et **Nunito Sans**, propositions de la charte retenues pour l’intégration. Dix faces WOFF2 latin/latin étendu, poids demandés, téléchargées depuis Google Fonts ; licences OFL et provenance conservées dans `public/nona/fonts`. Aucune requête Google Fonts du navigateur. Les polices et petits assets officiels entrent aussi dans le manifeste hors ligne ; le composite gestionnaire de 2 Mo en est exclu.
- Logo raster officiel fourni. Personnage entier dans la navigation gestionnaire issu du composite officiel A ; portrait voyageur issu du fichier `mascotte-reference.png`. Le papier extérieur du portrait est recadré par CSS, son intérieur reste opaque ; aucun nouveau dessin.
- Gestionnaire : navigation et état actif bordeaux, titre éditorial, ajout principal, recherche, filtres existants, tri, trois colonnes desktop, deux puis une selon la place, photos dominantes, statuts, actions visibles Modifier/Voir la fiche. Permissions, callbacks, QR et suppression existants conservés.
- Guide partagé : navigation légère, titre et localisation, couverture avec vrai média du logement, galerie et contrôles, quatre rubriques principales en deux colonnes, autres rubriques accessibles, services photographiques horizontaux immédiatement dessous. Les cartes d’accueil A proposent **Découvrir** ; le catalogue complet et le formulaire existants gardent les vrais prix et les actions de réservation.
- Même palette et composants sur éditeur, import/création, services, commandes, messages, équipe, tableau de bord, paiements, connexion/inscription. Les formulaires de connexion n’ont pas été soumis ; aucune authentification externe effectuée.
- Chat : portrait officiel, palette, titres, bulles, saisie et fenêtre mobile harmonisés. Transport local, moteur conversationnel, validations, devis et logique de réservation conservés. L’étiquette de recette reste visible ; seul le titre visuel de la page locale retire la longue mention technique déjà portée par cette étiquette. Les données envoyées au modèle restent inchangées.

## Prévisualisation

- `http://127.0.0.1:4183/design-review` : guide, gestionnaire, comparaison avant/après et QR téléphone.
- `http://127.0.0.1:4182/nona` : interface avec vraie génération Ollama locale.
- `http://127.0.0.1:4183/demo?preview=manager` : composants gestionnaire réels sur données de démonstration.

Le serveur compilé utilise un backend fictif `.invalid`, bloque son fetch sortant et n’accepte que des lectures. Il ne sert aucune mutation de compte, serveur, paiement ou base distante.

L’accès téléphone sur le Wi-Fi est un relais local temporaire sur le port 4184 : clé aléatoire de 256 bits, cookie HttpOnly/SameSite, expiration de quatre heures, vérification de l’origine et liste stricte des routes. Mode IA cloud, comptes, configuration, commandes et paiements refusés. Le relais vérifie que le laboratoire est exclusivement Ollama avant de s’ouvrir. Aucun pare-feu ni réglage Windows modifié. Son URL d’accès et son PID restent hors Git dans `work/nona-private/design-preview.json` ; le QR est calculé à la demande, jamais commité.

Sur HTTP LAN, les navigateurs ne fournissent pas toujours `crypto.randomUUID`. Le relais de recette fournit uniquement cette primitive via `crypto.getRandomValues`, UUID v4 cryptographiques, sans modifier le code métier ni la version production. Le navigateur a effectué un vrai tour IA à travers ce relais. Un téléphone physique n’était pas disponible à l’agent : la compatibilité a été testée dans Chrome avec viewport mobile, et l’accès HTTP/TCP sur l’adresse Wi-Fi du PC a été vérifié.

## Vérifications et captures

- **480 tests passent** : 461 Vitest et 19 Node ; trois ignorés explicitement (deux imports réseau externes opt-in, un contrôle POSIX de fichiers sous Windows). Les tests d’isolation des locataires, des droits, des commandes et de facturation restent dans la suite.
- TypeScript, build complet, build local isolé, contrôle SSR compilé, inventaire des 26 migrations : OK.
- Lint : aucune erreur ; 23 avertissements React Fast Refresh préexistants.
- Chrome : gestionnaire et guide à 1440 px, guide à 360/390/430 px, chat, services, formulaire, éditeur, messages, commandes, équipe, tableau de bord, paiements et connexion/inscription.
- Quatre raccourcis, deux colonnes sur tous les guides ; cibles de 102 px sur mobile, 64 px desktop ; aucun débordement de document aux largeurs contrôlées. Carrousel horizontal contenu dans sa section.
- Réservation réellement soumise au **transport simulé existant**, réception du récapitulatif « Demande enregistrée » ; aucun paiement ni commande distante.
- Parcours de collage complet rejoué : ambiguïté tardive, provenance, correction humaine, brouillon, édition/publication simulée et Wi-Fi côté voyageur passent.
- Vraie réponse IA locale Wi-Fi sur la nouvelle interface, puis via le relais LAN ; coût facturable zéro, aucune requête navigateur externe.

Preuves structurées : `docs/evidence/nona-da-browser-20261017.json`, `nona-da-phone-browser-20261017.json`, `nona-da-lan-20261017.json`, `nona-interface-wifi-20261017.json`, `nona-compiled-import-20261017.json`. Captures dans `docs/evidence/da/before` et `after` ; revue interactive dans `review.html`.

Comparaison qualitative itérée, sans pourcentage pixel à pixel. Les captures avant/après partagent leurs viewports ; la planche officielle assemble trois formats et contient des images, noms et données différents. La démo gestionnaire encadrée avant devient une vue autonome après. Corrections issues des comparaisons : état actif de la navigation, police et couleur exactes de la charte, proportions mobile, ordre sections/services, titre local sans diagnostic, contraste du contrôle Photos, actions visibles et espacement des liens de connexion.

## Écarts résiduels et reprise

1. **Animation finale de coucou absente du dossier.** Le personnage est officiel et statique ; ne pas présenter un mouvement CSS générique comme l’animation finale. Les masters vectoriels du logo/personnage ne sont pas fournis. Le recadrage raster reste moins net qu’un vrai master transparent, particulièrement sur écran très dense.
2. Photos, noms, nombre de logements, disponibilités et tarifs de la maquette ne sont pas injectés dans les données réelles. Les trois logements et leurs statuts de démonstration sont conservés. Tailles tactiles et textes réels peuvent produire des hauteurs différentes de la planche.
3. **Corbeille restaurable 30 jours non implémentée dans le backend existant.** Onglet désactivé avec explication ; aucun comportement fictif ni changement de suppression pour une mission visuelle.
4. La recette locale ne remplace ni une validation d’un compte client hébergé ni une validation de Haiku. Aucun déploiement production, aucune activation du registre de dépenses, aucun changement de Stripe/abonnements/commission de 2 %.

Les seules ressources artistiques encore nécessaires sont les masters transparents/vectoriels et l’animation finale fidèle au dessin. Les choix de fontes et de responsive proposés dans la charte ont été exécutés sans demander de décisions techniques à l’utilisateur.
