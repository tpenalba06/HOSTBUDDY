# PMS runtime — 5 octobre 2026

Guesty lisait PMS_ENCRYPTION_KEY depuis process.env, ce qui ignorait le binding Cloudflare de la requête. L'encodage/décodage utilise désormais le binding courant, sans cache et sans fallback Node si la requête est Cloudflare. Le statut configured vérifie une clé décodée de 32 octets au lieu de la simple présence d'une chaîne.

Vérification : 4 nouvelles assertions (clé worker contre stale Node, isolation par AAD tenant, rotation de clé par requête, binding absent/type invalide, taille incorrecte et support Node) ; suite provider 10 tests. npm run check complet : 197 tests/38 fichiers, TypeScript, lint sans erreur et build réussis.

Aucune valeur secrète, migration, modification de médias, changement de credentials enregistrés ou appel Guesty réel dans ce lot. L'enveloppe AES-256-GCM et l'AAD tenant restent identiques ; il faut conserver exactement la clé existante lors de la configuration du binding. Ne pas générer une nouvelle clé pour remplacer une ancienne en production, cela rendrait les credentials existants illisibles.

Guesty reste non validé réseau faute de credentials de test. Les sept autres PMS gardent leur classification honnête et leur repli import.

Rollback : revert du commit ; aucun changement de schéma ni de données.
