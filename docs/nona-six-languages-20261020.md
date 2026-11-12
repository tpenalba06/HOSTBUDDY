# NONA — recette cloud réelle dans les six langues

Reprise du checkpoint `625dc54` avec les corrections de codes d'accès et d'allergènes conservées. Cette recette a réellement utilisé Gemma 4 31B via l'API directe Ollama Cloud Free ; aucune dépendance à Ollama local, aucun paiement et aucune recharge.

## Résultats de la recette

Vingt appels de génération ont été effectués, avec un maximum de vingt réservations autorisées dans le lanceur. Les six langues ont atteint un brouillon prêt de petit-déjeuner pour trois personnes, le lendemain à 09:00, formule Classique. **Le montant de 75 € provient du serveur, pas du texte généré.** Aucun envoi de commande, confirmation gestionnaire ou paiement n'a eu lieu.

| Langue | Réponses IA acceptées | Récapitulatif à 75 € |
| --- | ---: | --- |
| Français | 4 | Oui |
| Anglais | 2 | Oui, après un repli initial |
| Espagnol | 2 | Oui, après un repli initial |
| Allemand | 3 | Oui |
| Italien | 3 | Oui, dans un second scénario après un refus préalable sans génération |
| Portugais | 2 | Oui, après des replis |

Ce tableau ne représente pas six parcours entièrement réussis sans interruption. L'anglais et l'espagnol ont d'abord été refusés à tort parce que le contrôle incluait un rappel de données déjà reçues avant la véritable question. La séparation après un point-virgule ou un point d'interrogation espagnol ouvrant a été corrigée et les deux réponses réelles sont devenues des régressions de test. Les parcours ont ensuite été poursuivis, sans régénérer le premier tour.

En portugais, une réponse sans question explicite a été remplacée par la question guidée correcte avant poursuite. Deux tours, italien et portugais, n'ont pas atteint la génération ; la cause exacte du refus d'admission n'est pas établie. Ne pas les présenter comme des pannes de génération. Le changement de sujet vers le Wi-Fi a conservé les informations serveur, mais la formulation trop affirmative sur le contenu de la rubrique a été refusée.

La recette totalise **16 réponses IA acceptées, quatre formulations IA remplacées par le repli et deux tours guidés sans génération**. Les règles ont évolué pendant l'essai : ce résultat exploratoire n'est pas un benchmark stable.

## Extraits authentiques

Français, au récapitulatif : « Un excellent choix, c'est une valeur sûre pour se faire plaisir ! Je te laisse vérifier le récapitulatif, et sache que rien n'a encore été envoyé. »

Anglais : « A classic choice, timeless and delicious. Please review your summary; nothing has been sent to the host yet. »

Espagnol : « Una elección exquisita, el clásico nunca falla. He preparado el borrador; revísalo ahora mismo, pero recuerda que aún no se ha enviado nada al anfitrión. »

Allemand : « Eine klassische Wahl, sehr fein! Ich habe alles für dich zusammengestellt. Bitte schau dir die Zusammenfassung an und bestätige sie, denn bisher wurde noch nichts an den Gastgeber gesendet. »

Italien : « Ottima scelta, un classico non sbaglia mai! Ho preparato tutto: dai un'occhiata al riepilogo, ricordando che per ora non ho ancora inviato nulla al proprietario. »

Portugais : « Uma escolha deliciosa para começar bem o dia! Por favor, revê o resumo abaixo; lembra-te que ainda não enviei nada ao anfitrião, tens de confirmar no sistema. »

Ton observé : chaleureux et compréhensible, parfois assez générique ou emphatique. Le tutoiement français est conservé. Cette petite série ne démontre pas encore une excellente conversation sur tous les sujets ni une robustesse sur de longs historiques.

## Consommation mesurée et clôture

| Mesure | Résultat |
| --- | ---: |
| Générations réelles | 20 |
| Tokens entrants / sortants | 36 666 / 2 354 |
| Latence minimum / médiane / maximum | 0,688 / 0,843 / 2,589 s |
| Estimation technique avec cache | 0,00440732 $ |
| Consommation relevée chez Ollama | 0,00451 $ |
| Nouvelle dépense | **0 $** |

Le montant Ollama additionne les vingt nouvelles lignes du relevé authentifié, arrondies individuellement. Il est financé par Free ; ce n'est ni une facture ni un débit bancaire. Après essai : solde acheté de 0 $, recharge automatique Off, usage Free affiché 0,4 %. Les trois recettes cumulées représentent **49 appels** (48 Gemma et un GPT-OSS) et **0,01021 $ de consommation affichée**, toujours 0 $ payé.

TEST a été désactivé explicitement après les vingt appels. Vérification distante : **49 tentatives et 49 observations**, réserve conservatrice de **0,98 € sur 4 €**, politique mensuelle de 20 € désactivée. Une nouvelle demande de réserve après fermeture est refusée. La réserve est une enveloppe applicative retenue, distincte de la dépense réelle. Aucun compteur réinitialisé.

## Comparaison et portée

Claude Haiku 5.5 reste candidat sérieux. Son adaptateur est conservé ; aucune nouvelle clé, souscription, recharge Vercel ou consommation Haiku payante n'a été activée. Il n'existe toujours pas de comparaison réelle Haiku/Gemma à scénario identique ; aucun classement définitif de qualité n'est revendiqué.

Preuves : `docs/evidence/nona-six-languages-live-20261020.json`, `nona-six-languages-provider-20261020.json` et `nona-free-account-final-20261020.json`. Données synthétiques Villa Mare uniquement. Les codes Wi-Fi et coordonnées ne sont pas inclus dans le contexte modèle. Stripe, moteur Services, commission et production inchangés.

La validation navigateur est exécutée séparément dans GitHub Actions, sur le vrai renderer partagé et le backend compilé avec données synthétiques et repli guidé, sans clé IA sur le runner public. **Les captures navigateur ne représentent pas de nouvelles générations cloud.** Le bilan Actions, les captures et le checkpoint final sont joints dans le fichier de reprise.
