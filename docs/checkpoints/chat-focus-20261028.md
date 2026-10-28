# Champ de chat NONA — correction du 28 octobre 2026

Défaut utilisateur reproduit dans le véritable composant partagé NonaConcierge en démonstration locale synthétique, avec CSS applicatif : focus initial, saisie, clic ailleurs, nouveau clic au centre de la saisie. Avant correction, le footer absolu hérite de w-full ; il mesure 492×44 px devant le textarea 492×52 px. Le clic atteint le div input-group-addon, dont le gestionnaire ne cherche qu’un input, puis laisse BODY focalisé.

Correction strictement CSS : width:auto sur .nona-composer-footer. Le footer mesure désormais 44 px ; le centre reçoit TEXTAREA. La reprise du focus et l’ajout de texte au brouillon sont vérifiés par vrais clics navigateur en desktop et mobile 390×844. Le bouton d’envoi fonctionne toujours en démonstration guidée locale ; aucun appel IA fournisseur, aucune commande, aucune donnée réelle. La capture et les mesures sont dans docs/evidence/chat-focus-20261028.

Le build complet TEST après correction a réussi. Les 670 tests, TypeScript et lint du dernier merge étaient verts ; aucune logique métier modifiée ici. L’aperçu Lovable distant a demandé une connexion : aucun contournement ni validation visuelle distante prétendue. Le commit est synchronisé sur la branche connectée et sa réception est contrôlée par le connecteur Lovable.

IA : intégration Gemma conservée dans le code, autorisation TEST fermée et plafond épuisé ; démonstration marketing guidée localement, aucune activation continue. Bêta non ouverte et aucune publication du site public.
