# HostBuddy V1 — sécurité et comptes, 5 octobre 2026

## Corrections préparées

- RPC invitation : réinviter un propriétaire ne peut plus le rétrograder. L'upsert protège aussi le conflit concurrent. Aucun rôle owner ne peut être attribué via le formulaire/server fn.
- Les invitations sont écrites exclusivement par le RPC autorisé propriétaire. Le rôle owner d'une ancienne invitation invalide n'est jamais consommé à la première connexion. Aucune ligne existante supprimée ou corrigée automatiquement.
- Première connexion : verrou transactionnel par utilisateur, puis vérification de l'appartenance pour éviter les organisations dupliquées sur deux chargements concurrents.
- Imports : lecture membre conservée, écritures admin/propriétaire uniquement et logement appartenant à la même organisation obligatoire.
- Messages : seul read_at est modifiable directement. Les réponses restent des INSERT manager autorisés, empêchant de réécrire les paroles du voyageur.
- Les mutations d'équipe vérifient le propriétaire sur le client JWT utilisateur avant d'appeler le RPC. La vérification SQL reste autoritaire.

## Validation locale réelle

Six tests team-access passent (propriétaire, refus admin/member/unknown, échec de membership, erreur RPC neutralisée). TypeScript et lint des fichiers de ce lot : voir résultat transmis à l'agent principal. Ces tests n'affirment pas que les politiques PostgreSQL déployées ont été exercées.

## Validation PostgreSQL préparée, pas exécutée localement

`scripts/validation/team-tenant-isolation.sql` : fixtures entièrement transactionnelles utilisant trois utilisateurs fictifs `example.invalid`, deux organisations, logements, médias et objet storage fictif, conversations/messages, services/commandes, feedback, paramètres paiement et ledger, jetons PMS et provenance. Aucune adresse réelle, aucun email émis, aucune donnée réelle modifiée.

Assertions : RLS activée, invisibilité B à A, capacités/jetons illisibles même aux gestionnaires, refus de modification B, protection propriétaire, refus détournement membre autre organisation, invitation/acceptation idempotente, owner/admin/member, lecture message conservée, read_at autorisé mais corps protégé, import member refusé et suppression membre fonctionnelle. Les assertions échouent explicitement; ne jamais annoncer succès après erreur.

Pour valider avant application : combiner dans UNE transaction `BEGIN;`, corps de la migration 0017 sans BEGIN/COMMIT, corps de la validation sans BEGIN/ROLLBACK ni SELECT final, puis `ROLLBACK;`. Exécuter sur preview avec propriétaire base et arrêt sur toute erreur. Puis appliquer 0017 seulement après assertions réussies, et rejouer le script de validation sur l'état réellement appliqué.

Migration `drizzle/migrations/0017_team_invitation_guards.sql` remplace fonctions/grants/policies seulement, sans changer les données. Politiques retry-safe. Rollback exact `scripts/rollback/0017_team_invitation_guards.sql` nécessite opt-in explicite et réouvre des vulnérabilités connues; stratégie recommandée si problème : désactiver temporairement le formulaire équipe et garder les protections, corriger en avant. Ne jamais exécuter ce rollback en production.

## Toujours non vérifié

Réception/acceptation de mail invitation (aucun provider d'envoi opérationnel, interface honnête « Préparer l'accès », pas « email envoyé »); email/password signup complet, reset password reçu, nouveau mot de passe, login/logout complet; test réel Google reste preuve de l'agent principal. Les comptes SQL fictifs valident l'autorisation SQL, pas une authentification réseau. Le test A/B HTTP serveur avec deux sessions différentes doit être rejoué par l'agent principal. La migration reste préparée tant que l'agent principal n'a pas confirmé son exécution et ses assertions PostgreSQL.

## Reprise exacte

1. Agent principal exécute validation transactionnelle combinée 0017 + SQL test via accès backend preview.
2. Si assertions passent, applique 0017 puis rejoue SQL test sans modifier ses politiques.
3. Crée seulement des comptes test autorisés et vérifie routes serveur A/B via véritables sessions; ne pas envoyer de mail aux vraies personnes.
4. Réexécute lint/tests/TypeScript/build et commit séparé du lot sécurité.
