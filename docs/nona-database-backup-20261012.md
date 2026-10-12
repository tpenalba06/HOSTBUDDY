# Nona — sauvegarde logique DB/Auth TEST, 12 octobre 2026

**Préparée et testée sur données synthétiques ; pas activée ni exécutée contre PostgreSQL TEST.**

Les médias sont déjà sauvegardés séparément dans NONA-OPS. Ce nouveau module comble le manque de code pour l'export PostgreSQL/identités Auth ; il ne fournit pas un accès SQL et ne ferme pas le NO-GO à lui seul. Il ne réexécute aucune restauration ni recette de permissions/Stripe/mobile.

## Périmètre et garde-fous

`scripts/ops/database-backup.py` accepte uniquement la référence `mhhtnqfdkyudwyqlmnce`, base `postgres`, port 5432. Connexion directe au seul hôte `db.mhhtnqfdkyudwyqlmnce.supabase.co` ou pooler session Supabase avec utilisateur portant exactement cette référence. Aucun hôte de pooler déduit d'une région : copier la valeur autorisée depuis le panneau Connect du projet TEST. Source et autre référence refusées avant appel aux clients PostgreSQL. Le port transactionnel 6543 est refusé.

Entrées JSON et clé AES privées, fichiers réguliers 0600 uniquement, liens symboliques et fichiers trop grands refusés. Aucun secret dans les arguments, l'environnement parent transmis au client, la sortie ou le manifeste. Mot de passe passé par un fichier pgpass temporaire 0600, supprimé avec le répertoire propre à cette exécution. L'environnement enfant est reconstruit : pas de service PostgreSQL implicite, PGHOST/PGPASSWORD hérités, overrides TLS ou configuration Stripe.

TLS impose `verify-full` et les autorités système de libpq 17+. Les lectures SQL demandent `default_transaction_read_only=on`. Seul `pg_dump` exporte la base, sans filtre de schéma ni de table et sans option permettant un export partiel RLS. Aucun SQL de mutation ou commande de restauration dans cet outil. Une erreur de lecture/permissions rend l'export invalide.

Dump custom PostgreSQL, limite par défaut 64 Mio (maximum 256 Mio), limite de fichier imposée au processus et délai 10 minutes. Les sorties brutes de pg_dump/pg_restore ne sont pas publiées. `pg_restore --list` vérifie la structure et exige les données `auth.users`, `auth.identities`, `public.properties`, `storage.objects` et `storage.buckets`. Cette vérification ne remplace pas une restauration ni un contrôle fonctionnel de récupération.

AES-256-GCM avec nonce aléatoire et format authentifié ; dump et SHA-256 dans le manifeste chiffré. Vérification avant publication atomique puis relecture/déchiffrement du fichier écrit et nouvelle lecture de l'inventaire. Sortie neuve 0600 dans un dossier privé hors dépôt ; aucun ancien backup écrasé. Vérification séparée possible, toujours sans connexion DB.

## Ce que contient cet export

Snapshot logique cohérent d'une seule base, avec schémas/données Auth lisibles par le rôle existant. Les hashes de mots de passe Auth inclus dans la base sont des données sensibles et restent chiffrés. Les octets Storage sont dans le backup médias distinct. Rôles globaux et leurs mots de passe, configuration des fournisseurs, SMTP, secrets applicatifs et configuration complète du projet restent des entrées de récupération séparées. Aucune promesse de restauration complète de Supabase à partir de ce fichier seul.

## Activation restante

1. Réutiliser une connexion PostgreSQL TEST déjà autorisée avec accès aux données nécessaires. Une clé HTTP `sb_secret_` ne la remplace pas. Aucun mot de passe à demander dans le chat, rôle à créer ou mot de passe à réinitialiser par ce chantier.
2. Vérifier les clients PostgreSQL 17+ avant chargement des secrets. Le modèle inerte échoue avant les entrées privées s'ils sont absents ; aucune installation ni abonnement effectués ici.
3. Après accès et autorisation concrets, adapter le modèle inerte `docs/ops/nona-isolated-database.workflow.yml` dans NONA-OPS privé avec la clé de chiffrement existante et une entrée PostgreSQL TEST privée. Ne pas installer ce workflow dans le dépôt applicatif public.
4. Prouver un export réel, le chiffrement et la relecture distante de l'artifact privé, puis plusieurs cycles planifiés. Les runs manuels ne prouvent pas la récurrence. Aucun artifact plaintext, dump ou credential public.
5. Conserver ensemble les preuves DB/Auth et Storage mais la clé à part. La copie DB et les médias ne sont pas un snapshot transactionnel commun ; documenter leur écart temporel. Une restauration de cette nouvelle capture reste non prouvée ; ne pas répéter les restaurations anciennes pour masquer cette limite.

## Tests réalisés

Sept tests synthétiques PASS : refus de cible/hôte/port/champs non autorisés avant export ; fichiers privés sans symlink et bornés ; environnement reconstruit/TLS/lecture seule ; chiffrement authentifié et relecture, corruption/mauvaise clé refusées et non-écrasement ; Auth incomplet/taille excessive sans publication ; échec client sans stderr ni artifact ; CLI de mauvaise cible sans lecture de credentials.

Ces tests utilisent un inventaire PostgreSQL simulé. Ils ne prouvent ni connexion TEST, compatibilité du client avec le serveur, export réel, droits SQL, archive distante, cadence ou restauration. Les clients pg_dump/pg_restore et l'entrée PostgreSQL TEST ne sont pas disponibles dans le runtime de cette passe. **Blocage exactement identifié, aucun accès source.**

Références : [Supabase backups](https://supabase.com/docs/guides/platform/backups), [connexions PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres), [pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html), [TLS libpq](https://www.postgresql.org/docs/17/libpq-ssl.html), [autorités système](https://www.postgresql.org/docs/17/libpq-connect.html).
