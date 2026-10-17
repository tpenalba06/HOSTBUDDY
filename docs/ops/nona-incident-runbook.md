# Nona — procédure incident minimale

État au 14 octobre 2026. Opérations privées, pas d’action automatique sur les données ou les paiements. Les alertes GitHub acquises sont reçues dans le compte propriétaire ; canal e-mail activé, réception dans la boîte e-mail non observée. Le contrôle Lovable est quotidien, pas temps réel. Le lecteur commercial reste conditionné à l’accès officiel au backend.

1. Ouvrir NONA-OPS > Actions > run en échec et son résumé. Noter l’heure, la cible (TEST/commercial/HTTP) et le code fixe. La failure du run 38395628783 est la preuve intentionnelle du canal, pas un incident client.
2. HTTP : distinguer DOWN, RESTRICTED, limitation et BUILD_UNVERIFIED. Un 403 ou une ancienne version ne suffit pas à conclure à une panne. Lire le dernier cycle automatique ; ne pas relancer toute la recette.
3. Serveur : Lovable > projet HOSTBUDDY > Plus > Cloud > Logs. Examiner le type d’événement fixe. Ne copier aucun token, corps de requête ou donnée client vers un ticket public. Vérifier la disponibilité du fournisseur et l’heure de la dernière publication.
4. Paiement/commande : rapprocher en lecture seule vendeur, mode, commande et événement Stripe. Ne pas créer une seconde commande, débiter, rembourser, modifier le ledger ou rejouer un webhook aveuglément. Les actions financières réelles nécessitent l’autorisation du titulaire. Un retour navigateur n’est pas une preuve de paiement.
5. Corriger seulement le défaut démontré dans la branche et vérifier sa régression ciblée. Publication/rollback de production, modifications métier et restauration restent sous autorisation distincte. Informer les clients concernés par le canal légitime ; l’agent n’envoie pas de message sans autorisation.

## Perte de données et reprise

Conserver les exports manuels commerciaux signalés par le propriétaire ; ils n’ont pas été inspectés ici. Leur date, intégrité, couverture Auth et présence des octets Storage doivent être établies avant d’annoncer un objectif de reprise. Aucun RPO/RTO garanti.

Les archives NONA-OPS TEST sont chiffrées, retenues sept jours, récupérées et vérifiées ; elles ne contiennent pas la production. Restaurer uniquement sur une cible isolée expressément autorisée, jamais en écrasant le backend commercial. Reconstituer DB/Auth, médias privés et configurations de façon cohérente ; protéger les secrets et éviter les mélanges TEST/Live. La restauration isolée acquise ne doit pas être répétée sans nouveau motif.

L’accès externe commercial Lovable reste dépendant du fournisseur. Ne pas contourner l’interface, exposer une RPC de dump, utiliser une clé publique comme clé serveur, migrer ou acheter un service pour résoudre cette dépendance. Documenter la lacune ; demander un export manuel officiel si un incident l’exige.

## Cadence et budget

Schedules GitHub susceptibles de retard ou d’omission. Consulter les dates des derniers runs, pas seulement une pastille verte historique. Budget Actions zéro avec arrêt conservé ; aucune recharge Lovable automatique activée. Une pause pour quota épuisé demande une décision, pas un achat par l’agent. Ne pas additionner de nouvelles séries horaires au passage commercial : adapter les jobs existants après autorisation.
