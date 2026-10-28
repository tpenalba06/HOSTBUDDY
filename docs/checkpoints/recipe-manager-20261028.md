# NONA — recette autorisée et validation gestionnaire, 28 octobre 2026

## Décision et périmètre

- **Guide Vercel TEST : VALIDÉ dans son périmètre isolé.** Déploiement final `dpl_HBrkxmwNsUTKWMxa1h3nfGgoWwiS`, READY, staging, projet live=false et SSO conservé. URL : https://nona-concierge-test-20261020-q07nj3h1p.vercel.app/
- **Gemma Cloud : recette réelle effectuée, qualité finale BLOQUÉE.** Dix appels supplémentaires autorisés ont été consommés : quatre réponses acceptées, six réponses remplacées par le moteur guidé. Aucun succès IA n'est attribué aux replis.
- **Gestionnaire : parcours authentifié local relié au vrai Supabase TEST vérifié**, y compris lecture du logement existant, éditeur, création d'un service fictif désactivé, affichage mobile et lecture du guide invité. Cela ne constitue pas un déploiement Vercel de l'application gestionnaire complète, ni une validation du formulaire de connexion par mot de passe.
- **Bêta privée : NON OUVERTE.** Qualité Gemma insuffisante, gestionnaire complet non hébergé sur cet aperçu, aucun destinataire externe autorisé fourni. Aucune invitation envoyée.

## Conditions et consommation Ollama

Le nouvel accord utilisateur portait sur quinze minutes et les dix appels restants, sans augmenter le plafond cumulatif ni effectuer de paiement. La fenêtre n'a été ouverte qu'après un nouveau contrôle authentifié.

La page d'usage affichait désormais « Pay as you go », mais confirmait les crédits d'usage gratuits et l'éligibilité de `gemma4:31b`. Auto-reload : Off. Page de facturation : aucun abonnement souscrit affiché, aucune facture. Diagnostic authentifié : 2.48299 USD de crédits inclus avant recette, 2.48019 USD après ; crédits achetés 0 USD avant et après. **Débit réel des crédits inclus : 0.00280 USD ; nouveau paiement : zéro.** Le compteur du fournisseur est passé de 72 à 82 requêtes Gemma. Ces observations datées ne prouvent pas une gratuité permanente.

Revue valable de 2026-10-28T10:36:03.789Z à 10:51:03.789Z. Fermeture explicite après les dix appels, et variable privée Preview `NONA_OLLAMA_TEST_ENABLE` remise à `closed-after-recipe`.

État final Supabase TEST `mhhtnqfdkyudwyqlmnce` : enabled=false, reserved_micros=1660000, cap_micros=1660000, **83 réservations et 83 observations**. Aucun compteur réinitialisé. Politique mensuelle 20 EUR toujours désactivée. Une réservation supplémentaire a réellement retourné false. Les contrôles navigateur du déploiement final sont en mode guided, modelCalls=0. Aucun appel supplémentaire n'est autorisé par ce checkpoint.

Les dix appels ont consommé 22504 tokens d'entrée et 864 tokens de sortie. Estimation tarifaire instrumentée : 0.00275312 USD, distincte du débit authentifié. Latence fournisseur : 698–1796 ms. Les observations navigateur complètes étaient généralement autour de 2.3–2.6 secondes ; elles incluent l'automatisation et ne constituent pas une mesure pure du réseau. Des délais d'observation du navigateur n'ont pas causé de renvoi des requêtes fournisseur.

## Qualité réellement constatée

- FR libre et massage explicite : deux réponses IA acceptées, chaleureuses et avec tutoiement, sans la localisation inventée précédemment observée.
- EN et ES : appels réels effectués, mais réponses remplacées par un repli de salutation générique. IT : appel réel remplacé par une réponse d'incertitude. Ne pas déclarer ces trois langues validées en conversation libre.
- PT : première réponse réellement générée acceptée, sans le mot anglais précédemment observé ; seconde conversation libre remplacée par un repli.
- DE : la phrase contenant « entspannen » a déclenché une fausse urgence sans appel fournisseur. Une reformulation sans ce mot a ensuite reçu une réponse Gemma réelle acceptée. Cela a permis d'isoler un défaut du moteur guidé, et non du fournisseur.
- Changement de sujet FR et contexte prolongé : appels réels avec repli ; la dernière réponse avait relancé un ancien parcours de massage malgré une demande explicite de ne rien réserver. Ce défaut a été corrigé après consommation de l'enveloppe, sans nouvelle génération.
- Les dix appels couvrent les six langues, mais **seulement FR, DE et PT ont reçu une réponse IA acceptée dans cet échantillon**. Le taux d'acceptation technique est 40 %, pas un taux de qualité linguistique.
- Les raisons détaillées de chaque rejet fournisseur n'ont pas été obtenues via les logs Vercel ; ne pas attribuer sans preuve les six rejets à une même cause.

## Corrections et preuves

1. Détection française de « panne » limitée au mot entier, singulier ou pluriel. Elle ne reconnaît plus une sous-chaîne du mot allemand « entspannen ». Les vraies pannes restent des urgences. Test de non-régression ajouté et vérification du même texte allemand sur la Preview finale : plus de réponse d'urgence ni de 112, zéro appel modèle.
2. Les formulations explicites « sans réserver quoi que ce soit » et « sem reservar nada » suspendent le parcours de réservation, y compris face à une proposition modèle qui tenterait de le reprendre. Le brouillon existant est conservé en mémoire, sans nouvelle question de réservation ni devis actif. Tests FR/PT ajoutés. Vérification réelle sur la Preview finale après un brouillon massage : nextStep=null, quote=null, mode guided, modelCalls=0. La réponse de repli demeure peu conversationnelle : aucune validation de qualité finale n'est déduite de cette correction de sécurité.
3. Création d'un service gestionnaire : le formulaire assigne volontairement un UUID stable au brouillon, mais `saveService` utilisait `.single()` pour chercher une ligne qui n'existait pas encore. Le vrai navigateur a produit le code `PGRST116`. Remplacement par `.maybeSingle()` ; les erreurs de permission restent bloquantes et le RPC existant garde ses protections contre les identifiants d'un autre tenant. Deux tests ajoutés. Aucun changement de schéma ou élargissement des droits.
4. Diagnostic console des opérations limité à un code d'erreur borné, sans message serveur, identité, requête ou secret. Aucun détail technique ajouté au parcours utilisateur.

Le nouveau paquet du guide contient 58 fichiers ; seul `server/nona-hosted-test-entry.js` a été renvoyé, avec SHA1 `25eb8bc4043a9231aec463426ba3d2e0ff06db06`. Les 57 fichiers client/configuration restants sont repris sans modification. La DA et la mascotte sont préservées. Les corrections du gestionnaire sont conservées dans le code et le build local TEST ; elles ne sont pas annoncées comme publiées par le paquet limité au guide.

## Gestionnaire et données TEST

Compte synthétique confirmé `e000c869-38d4-432f-874c-20983a30b6ae`, organisation TEST `c4edc96c-482a-46fb-9efe-ed3c7f9dd8e1`, logement existant `37ce8e1c-81b4-4b89-bdeb-211c65772c44`. Le domaine synthétique `example.invalid` et l'appartenance owner/admin ont été vérifiés avant création d'une session Supabase légitime, sans envoi d'e-mail. Aucun compte tiers impersonné, aucun mot de passe changé, aucune désactivation du SSO.

Le runtime local a été reconstruit avec URL et clé publique exclusivement TEST ; son audit des fichiers client refuse le projet de production et les deux identifiants privés du coffre. Les requêtes serveur sortantes sont limitées à Supabase TEST, et aucune clé IA/Stripe n'est fournie à ce runtime. Le navigateur a chargé une seule organisation et son logement, puis l'éditeur réel.

Après correction, le service **« Petit-déjeuner — BROUILLON TEST FICTIF »** a été enregistré depuis le vrai formulaire. Confirmation indépendante en base : id `8294528d-7a81-42ae-8e21-87f490c3e682`, is_active=false, 25 EUR par personne, quantité maximale 3, zéro commande créée. Le guide invité publié expose zéro service pour ce logement. Aucune publication commerciale, aucune confirmation de réservation, aucun paiement. Ce brouillon TEST volontairement conservé n'est pas le service commercial Villa Mare.

Le gestionnaire a été contrôlé sur desktop et mobile 390×844 ; le guide invité réel a été ouvert en lecture locale. Les captures sont dans `docs/evidence/recipe-20261028`. Les serveurs locaux 4288 et 4289 sont devenus inaccessibles après l'interruption finale ; les deux URL ont retourné ERR_CONNECTION_REFUSED lors du contrôle. Les sessions précédentes avaient été déconnectées ; l'unique session restante créée par cette recette a été révoquée, avec vérification de zéro session restante dans cette fenêtre et pour ce seul utilisateur synthétique. Les jetons déjà émis ne sont pas présentés comme effacés instantanément de tous les caches ; leur durée native reste applicable.

## Vérifications finales

- Vitest : **670 tests réussis**, deux ignorés ; 101 fichiers réussis, un ignoré.
- Node : **19 tests réussis**, un ignoré, zéro échec ; serveur de test local autorisé uniquement pour ces tests.
- TypeScript réussi. Lint complet initial : zéro erreur, 23 avertissements existants. Lint des quatre fichiers modifiés : zéro erreur.
- 27 migrations : inventaire et empreintes vérifiés ; aucune migration historique modifiée.
- Build complet du gestionnaire avec backend TEST : réussi. Smoke SSR compilé HTTP 200, WOFF2 et priorité image vérifiés. Paquet final du guide construit et contrôlé : origine étrangère 403, commande HTTP 405, production 403, aucun accès réseau dans ces contrôles.
- Comparaison en mémoire des clés privées du coffre avec les 54 fichiers frontend du paquet du guide : zéro fuite. Audit client du gestionnaire également passé. Les secrets, sessions et fichiers DPAPI ne sont pas inclus dans Git ni dans les captures.
- Les tests d'isolation, comptabilité 2 % et protections de paiement réussis au checkpoint précédent restent consignés dans `final-test-20261026.md`. Aucun appel Stripe, aucune génération supplémentaire, aucune invitation externe dans cette reprise.
- Le diagnostic de photo nulle a été écarté : une reproduction transactionnelle n'a pas confirmé cette hypothèse et a été annulée. Un probe de RPC avec clé serveur a retourné 42501 ; il n'a pas été confondu avec le refus du navigateur authentifié, qui était bien PGRST116. Aucune modification de droits n'a été faite sur ces hypothèses.

## Suite et limites d'autorisation

La qualité Gemma doit encore être améliorée puis réévaluée ; le plafond autorisé est intégralement réservé et aucune nouvelle génération n'est permise sans nouvelle enveloppe explicite et nouveau précontrôle financier. Le gestionnaire devra être hébergé et contrôlé sur TEST avant une ouverture complète. Les destinataires autorisés sont indispensables avant toute invitation externe. Aucune dépense récurrente, carte, auto-recharge, facturation mensuelle ou action production n'a été autorisée ni activée.

Le commit et le bundle complet de cette reprise sont identifiés dans le reçu externe du checkpoint. Les bundles et preuves antérieurs sont conservés. Aucun fichier `sources/` modifié, aucun push vers la branche reliée à Lovable, aucun usage du connecteur Lovable ni de ses crédits.

## Contrôle responsive final

Le contrôle mobile authentifié a révélé des boutons comprimant le titre du service. La carte empile désormais les actions sous le titre sur petit écran ; la disposition desktop est conservée. Le build complet et le lint du composant ont réussi après cette correction. Les quatre tests de présentation gestionnaire ont réussi.

La capture `manager-mobile-fixed-visual.jpg` vérifie le vrai composant partagé et son CSS final avec une donnée synthétique, sans session ni réseau : ce contrôle visuel ne constitue pas une seconde transaction gestionnaire authentifiée. À 390×844 : largeur du titre 320 px, largeur totale 390 px sans débordement, actions sous le titre. La capture authentifiée antérieure est conservée séparément comme preuve du défaut constaté.
