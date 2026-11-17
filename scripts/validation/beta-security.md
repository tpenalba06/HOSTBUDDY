# Recette de sécurité NONA TEST

Le script cible exclusivement le projet Supabase `mhhtnqfdkyudwyqlmnce`, la Preview protégée de référence et les deux logements « Recette Isolation Pilote ». Associer `A` et `B` aux comptes qui possèdent ces logements, dans cet ordre.

Sur Windows, initialiser une fois depuis le compte Windows de recette :

```powershell
pwsh -NoProfile -File scripts/validation/beta-security.ps1 -Renew -Configure
```

Saisir la clé secrète moderne du projet **TEST** dans l’invite locale masquée. Le lanceur appelle l’API administrative officielle pour les deux identifiants fixes et vérifie leurs adresses fictives avant modification. La clé secrète sert uniquement à cette opération et le lanceur ne l’enregistre pas. Saisir ensuite la clé publique TEST. Seuls la clé publique et les identifiants de recette sont conservés par Windows DPAPI sous `%LOCALAPPDATA%\NONA\test-recipe`. Le même utilisateur Windows doit relancer la recette. Les sessions Supabase sont renouvelées par connexion à chaque exécution.

Pour les requêtes de séjour, lancer dans un environnement disposant d’un accès Vercel autorisé et limité à la Preview. Le script accepte un jeton Trusted Sources de courte durée fourni uniquement au processus dans `NONA_TEST_VERCEL_OIDC`. Une redirection vers Vercel ou un refus de la protection est un échec du prérequis, pas un résultat du contrôle de séjour.

```powershell
pwsh -NoProfile -File scripts/validation/beta-security.ps1
```

Le script exige au moins une ligne propre à chaque gestionnaire pour chaque catégorie testée. Il refuse d’envoyer une mutation REST si un contrôle préalable de lecture n’a pas confirmé que PostgREST applique `Prefer: tx=rollback`. L’outil journalise les résultats et statuts uniquement. Il n’affiche ni les corps HTTP ni les jetons.

La matrice télécharge aussi un objet privé existant par compte via Storage, compare les statuts HTTP dans les deux sens et jette le contenu sans le journaliser. Des métadonnées et des objets privés doivent être présents pour les deux logements.
