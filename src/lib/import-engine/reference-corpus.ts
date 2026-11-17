/** Authored synthetic handover documents. These are references, not customer data
 * or a statistical claim about arbitrary documents. Every scored fact is annotated. */
export type ReferenceFact = { key: string; text: string; private?: boolean; conflict?: boolean };
type Locale = "fr" | "en" | "es" | "de" | "it" | "pt";
const facts = (rows: [string, string, ("private" | "conflict")?][]): ReferenceFact[] =>
  rows.map(([key, text, kind]) => ({ key, text, ...(kind ? { [kind]: true } : {}) }));
export const referenceLocales: Record<
  Locale,
  { name: string; facts: ReferenceFact[]; narrative: string }
> = {
  fr: {
    name: "Villa Opale",
    narrative:
      "Ce document rassemble les souvenirs de plusieurs échanges et les observations recueillies pendant la préparation du séjour. Certains passages reviennent sur le même sujet avec un autre point de vue. Nous avons conservé ces notes pour faciliter la relecture, sans leur attribuer une valeur de promesse. Le récit suit les échanges plutôt qu'un formulaire et les paragraphes peuvent être lus dans un ordre différent. Les formulations ont été gardées telles quelles pour permettre une comparaison attentive avec le résultat.",
    facts: facts([
      ["name", "Nom du logement : Villa Opale"],
      ["description", "Bienvenue à la Villa Opale, une maison lumineuse avec un patio abrité."],
      ["address", "Adresse : 12 rue des Oliviers, Nice."],
      ["arrival", "L'arrivée est possible à partir de 16:00.", "conflict"],
      ["departure", "Le départ doit être terminé avant 11:00."],
      ["access", "Les clés sont remises par la réception à votre arrivée."],
      ["wifi", "Wi-Fi disponible."],
      ["wifi", "Mot de passe Wi-Fi : RECETTE_WIFI_OPALE.", "private"],
      ["access", "Code d'accès : 7319.", "private"],
      ["equipment", "Le lave-linge se lance avec le programme coton et le bouton rond."],
      ["kitchen", "La cuisine comprend un four et un réfrigérateur sous le plan de travail."],
      ["climate", "Le thermostat du chauffage se règle avec les flèches latérales."],
      ["rules", "Les fêtes sont interdites et le silence est demandé après 22:00."],
      ["trash", "Les poubelles de tri sont derrière le local technique."],
      ["recommendations", "Le restaurant Les Tamaris prépare des légumes de saison sur la place."],
      ["recommendations", "Le musée des Céramiques propose un atelier de poterie le mercredi."],
      ["recommendations", "La balade du sentier des Roches rejoint le phare à pied."],
      ["parking", "Le stationnement est autorisé sur la place numérotée dans la cour."],
      ["transport", "Le bus des Collines dessert la gare depuis l'arrêt des Oliviers."],
      ["contact", "Contact : la réception répond aux questions pendant la journée."],
      ["contact", "Contact privé : recette@example.invalid.", "private"],
      ["emergency", "En cas d'urgence, le point de rassemblement est devant la mairie."],
      [
        "services",
        "Le petit-déjeuner est proposé sur demande préalable, sans disponibilité garantie.",
      ],
      ["departure", "Au départ, fermez les fenêtres et laissez la vaisselle propre."],
      [
        "arrival",
        "Une autre note indique une arrivée à 18:00 : information à confirmer.",
        "conflict",
      ],
    ]),
  },
  en: {
    name: "Opal House",
    narrative:
      "These notes bring together several conversations about preparing a stay and the impressions collected along the way. The writer moves between subjects rather than following a form. Some ideas recur with different wording because the original discussion was informal. The account is retained for a careful review and should not be treated as an additional promise. Each passage belongs to the same draft and may be considered independently while checking the source against the finished guide. No assumption should replace an explicit statement.",
    facts: facts([
      ["name", "Property name: Opal House"],
      ["description", "Welcome to Opal House, a bright home with a sheltered courtyard."],
      ["address", "Address: 12 Olive Street, Bristol."],
      ["arrival", "Arrival is available from 16:00.", "conflict"],
      ["departure", "Departure must be completed before 11:00."],
      ["access", "Keys are handed over by reception when you arrive."],
      ["wifi", "Wi-Fi available."],
      ["wifi", "Wi-Fi password: RECIPE_WIFI_OPAL.", "private"],
      ["access", "Access code: 7319.", "private"],
      ["equipment", "The washing machine starts with the cotton programme and the round button."],
      ["kitchen", "The kitchen has an oven and a refrigerator below the worktop."],
      ["climate", "The heating thermostat is adjusted using the side arrows."],
      ["rules", "Parties are prohibited and quiet is requested after 22:00."],
      ["trash", "Recycling bins are behind the utility room."],
      ["recommendations", "The Tamaris restaurant serves seasonal vegetables on the square."],
      ["recommendations", "The Ceramics museum offers a pottery workshop on Wednesday."],
      ["recommendations", "The coastal walk along the Rocks trail leads to the lighthouse."],
      ["parking", "Parking is allowed in the numbered space in the courtyard."],
      ["transport", "The Hills bus serves the railway station from the Olive stop."],
      ["contact", "Contact: reception answers questions during the daytime."],
      ["contact", "Private contact: recipe@example.invalid.", "private"],
      ["emergency", "In an emergency, the assembly point is outside the town hall."],
      ["services", "Breakfast is offered on prior request, without guaranteed availability."],
      ["departure", "On departure, close the windows and leave the dishes clean."],
      ["arrival", "Another note states arrival at 18:00, to be confirmed.", "conflict"],
    ]),
  },
  es: {
    name: "Casa Ópalo",
    narrative:
      "Este documento reúne conversaciones y observaciones recogidas durante la preparación de la estancia. La narración cambia de tema en lugar de seguir un formulario y mantiene las expresiones originales. Algunos párrafos retoman una idea desde otro punto de vista para facilitar una revisión cuidadosa. Estas observaciones no añaden ninguna promesa a los hechos escritos expresamente. Cada fragmento puede leerse por separado al comparar la fuente con la guía final. La intención es conservar el sentido del intercambio sin sustituirlo por suposiciones.",
    facts: facts([
      ["name", "Nombre del alojamiento: Casa Ópalo"],
      ["description", "Bienvenidos a Casa Ópalo, una casa luminosa con un patio protegido."],
      ["address", "Dirección: 12 calle de los Olivos, Sevilla."],
      ["arrival", "La llegada es posible a partir de las 16:00.", "conflict"],
      ["departure", "La salida debe completarse antes de las 11:00."],
      ["access", "Las llaves se entregan en recepción al llegar."],
      ["wifi", "Wi-Fi disponible."],
      ["wifi", "Contraseña Wi-Fi: RECETA_WIFI_OPALO.", "private"],
      ["access", "Código de acceso: 7319.", "private"],
      ["equipment", "La lavadora se inicia con el programa algodón y el botón redondo."],
      ["kitchen", "La cocina tiene horno y frigorífico debajo de la encimera."],
      ["climate", "El termostato de la calefacción se ajusta con las flechas laterales."],
      ["rules", "Las fiestas están prohibidas y se pide silencio después de las 22:00."],
      ["trash", "Los cubos de basura para reciclaje están detrás del cuarto técnico."],
      ["recommendations", "El restaurante Tamaris sirve verduras de temporada en la plaza."],
      ["recommendations", "El museo de Cerámica ofrece un taller de alfarería los miércoles."],
      ["recommendations", "El paseo por el sendero de las Rocas conduce al faro."],
      ["parking", "El aparcamiento está permitido en la plaza numerada del patio."],
      ["transport", "El autobús de las Colinas conecta la estación desde la parada Olivos."],
      ["contact", "Contacto: recepción responde a las preguntas durante el día."],
      ["contact", "Contacto privado: receta@example.invalid.", "private"],
      ["emergency", "En caso de emergencia, el punto de reunión está delante del ayuntamiento."],
      ["services", "El desayuno se ofrece previa solicitud, sin disponibilidad garantizada."],
      ["departure", "A la salida, cierre las ventanas y deje la vajilla limpia."],
      ["arrival", "Otra nota indica llegada a las 18:00, pendiente de confirmar.", "conflict"],
    ]),
  },
  de: {
    name: "Haus Opal",
    narrative:
      "Diese Notizen sammeln Gespräche und Eindrücke aus der Vorbereitung des Aufenthalts. Der Bericht wechselt zwischen verschiedenen Themen und folgt keinem Formular. Einzelne Gedanken tauchen mit anderer Formulierung erneut auf, weil die ursprünglichen Gespräche ungeordnet verliefen. Die Absätze bleiben für eine sorgfältige Durchsicht erhalten und stellen keine zusätzliche Zusage dar. Jeder Abschnitt kann beim Vergleich mit dem fertigen Ergebnis unabhängig gelesen werden. Aus allgemeinen Eindrücken sollen keine neuen Tatsachen entstehen und die ursprüngliche Bedeutung soll erhalten bleiben.",
    facts: facts([
      ["name", "Name der Unterkunft: Haus Opal"],
      ["description", "Willkommen im Haus Opal, einem hellen Haus mit geschütztem Innenhof."],
      ["address", "Anschrift: Olivenstraße 12, Freiburg."],
      ["arrival", "Die Ankunft ist ab 16:00 möglich.", "conflict"],
      ["departure", "Die Abreise muss vor 11:00 abgeschlossen sein."],
      ["access", "Die Schlüssel werden bei der Ankunft an der Rezeption übergeben."],
      ["wifi", "Kostenloses WLAN."],
      ["wifi", "WLAN Passwort: REZEPT_WIFI_OPAL.", "private"],
      ["access", "Zugangscode: 7319.", "private"],
      ["equipment", "Die Waschmaschine startet mit dem Baumwollprogramm und der runden Taste."],
      ["kitchen", "Die Küche hat einen Ofen und einen Kühlschrank unter der Arbeitsplatte."],
      ["climate", "Der Thermostat der Heizung wird mit den seitlichen Pfeilen eingestellt."],
      ["rules", "Partys sind verboten und nach 22:00 wird um Ruhe gebeten."],
      ["trash", "Die Mülltonnen zur Trennung stehen hinter dem Technikraum."],
      ["recommendations", "Das Restaurant Tamaris bietet saisonales Gemüse am Platz an."],
      ["recommendations", "Das Keramikmuseum bietet am Mittwoch einen Töpferkurs an."],
      ["recommendations", "Der Spaziergang auf dem Felsenpfad führt zum Leuchtturm."],
      ["parking", "Parken ist auf dem nummerierten Parkplatz im Innenhof erlaubt."],
      ["transport", "Der Hügelbus fährt von der Haltestelle Oliven zum Bahnhof."],
      ["contact", "Kontakt: Die Rezeption beantwortet tagsüber Fragen."],
      ["contact", "Privater Kontakt: rezept@example.invalid.", "private"],
      ["emergency", "Im Notfall befindet sich der Sammelpunkt vor dem Rathaus."],
      [
        "services",
        "Frühstück wird auf vorherige Anfrage angeboten, ohne garantierte Verfügbarkeit.",
      ],
      ["departure", "Bei der Abreise Fenster schließen und das Geschirr sauber hinterlassen."],
      ["arrival", "Eine andere Notiz nennt Ankunft um 18:00, noch zu bestätigen.", "conflict"],
    ]),
  },
  it: {
    name: "Casa Opale",
    narrative:
      "Questo documento raccoglie conversazioni e osservazioni emerse durante la preparazione del soggiorno. La narrazione passa da un argomento all'altro senza seguire un modulo prestabilito. Alcuni pensieri ritornano con parole diverse perché gli scambi originali erano informali. I paragrafi restano disponibili per una rilettura accurata e non rappresentano una promessa aggiuntiva. Ogni passaggio può essere confrontato separatamente con il risultato finale. Le impressioni generali non devono essere trasformate in nuovi fatti e le espressioni originali conservano il loro significato.",
    facts: facts([
      ["name", "Nome dell'alloggio: Casa Opale"],
      ["description", "Benvenuti a Casa Opale, una casa luminosa con un cortile riparato."],
      ["address", "Indirizzo: via degli Ulivi 12, Lucca."],
      ["arrival", "L'arrivo è possibile dalle 16:00.", "conflict"],
      ["departure", "La partenza deve concludersi entro le 11:00."],
      ["access", "Le chiavi vengono consegnate dalla reception all'arrivo."],
      ["wifi", "Wi-Fi disponibile."],
      ["wifi", "Password Wi-Fi: RICETTA_WIFI_OPALE.", "private"],
      ["access", "Codice di accesso: 7319.", "private"],
      ["equipment", "La lavatrice parte con il programma cotone e il pulsante rotondo."],
      ["kitchen", "La cucina ha un forno e un frigorifero sotto il piano di lavoro."],
      ["climate", "Il termostato del riscaldamento si regola con le frecce laterali."],
      ["rules", "Le feste sono vietate e si chiede silenzio dopo le 22:00."],
      ["trash", "I bidoni dei rifiuti differenziati sono dietro il locale tecnico."],
      ["recommendations", "Il ristorante Tamaris serve verdure di stagione nella piazza."],
      [
        "recommendations",
        "Il museo della Ceramica propone un laboratorio di terracotta il mercoledì.",
      ],
      ["recommendations", "La passeggiata sul sentiero delle Rocce conduce al faro."],
      ["parking", "Il parcheggio è consentito nel posto numerato del cortile."],
      ["transport", "L'autobus delle Colline collega la stazione dalla fermata Ulivi."],
      ["contact", "Contatti: la reception risponde alle domande durante il giorno."],
      ["contact", "Contatto privato: ricetta@example.invalid.", "private"],
      ["emergency", "In caso di emergenza, il punto di raccolta è davanti al municipio."],
      [
        "services",
        "La colazione è proposta su richiesta anticipata, senza disponibilità garantita.",
      ],
      ["departure", "Alla partenza, chiudere le finestre e lasciare le stoviglie pulite."],
      ["arrival", "Un'altra nota indica arrivo alle 18:00, da confermare.", "conflict"],
    ]),
  },
  pt: {
    name: "Casa Opala",
    narrative:
      "Este documento reúne conversas e observações recolhidas durante a preparação da estadia. O relato muda de assunto em vez de seguir um formulário e mantém as expressões usadas originalmente. Algumas ideias reaparecem com outras palavras porque as conversas foram informais e dispersas. Os parágrafos ficam disponíveis para uma leitura cuidada e não constituem uma promessa adicional. Cada passagem pode ser comparada de forma independente com o resultado final. As impressões gerais não devem dar origem a novos factos e o sentido original deve ser preservado.",
    facts: facts([
      ["name", "Nome do alojamento: Casa Opala"],
      ["description", "Bem-vindos à Casa Opala, uma casa luminosa com um pátio abrigado."],
      ["address", "Morada: rua das Oliveiras 12, Braga."],
      ["arrival", "A chegada é possível a partir das 16:00.", "conflict"],
      ["departure", "A saída deve estar concluída antes das 11:00."],
      ["access", "As chaves são entregues pela receção à chegada."],
      ["wifi", "Wi-Fi disponível."],
      ["wifi", "Senha Wi-Fi: RECEITA_WIFI_OPALA.", "private"],
      ["access", "Código de acesso: 7319.", "private"],
      ["equipment", "A máquina de lavar inicia com o programa algodão e o botão redondo."],
      ["kitchen", "A cozinha tem forno e frigorífico debaixo da bancada."],
      ["climate", "O termostato do aquecimento ajusta-se com as setas laterais."],
      ["rules", "As festas são proibidas e pede-se silêncio depois das 22:00."],
      ["trash", "Os contentores do lixo separado estão atrás da sala técnica."],
      ["recommendations", "O restaurante Tamaris serve legumes da época na praça."],
      ["recommendations", "O museu da Cerâmica oferece uma oficina de olaria à quarta-feira."],
      ["recommendations", "O passeio pelo trilho das Rochas leva ao farol."],
      ["parking", "O estacionamento é permitido no lugar numerado do pátio."],
      ["transport", "O autocarro das Colinas liga a estação a partir da paragem Oliveiras."],
      ["contact", "Contacto: a receção responde a perguntas durante o dia."],
      ["contact", "Contacto privado: receita@example.invalid.", "private"],
      ["emergency", "Em caso de emergência, o ponto de encontro fica diante da câmara municipal."],
      [
        "services",
        "O pequeno-almoço é proposto mediante pedido prévio, sem disponibilidade garantida.",
      ],
      ["departure", "À saída, fechar as janelas e deixar a loiça limpa."],
      ["arrival", "Outra nota indica chegada às 18:00, por confirmar.", "conflict"],
    ]),
  },
};

export function referenceDocument(locale: Locale, words: 500 | 2000 | 5000) {
  const spec = referenceLocales[locale];
  // Distribute facts throughout the entire source, with different order by length.
  const ordered = spec.facts.map((_, i, all) => all[(i * 7 + words / 500) % all.length]!);
  const narrativeWords = spec.narrative.split(/\s+/);
  const remaining = words - ordered.reduce((n, f) => n + f.text.split(/\s+/).length, 0);
  const parts: string[] = [];
  let consumed = 0;
  for (let i = 0; i < ordered.length; i++) {
    const amount = Math.floor((remaining * (i + 1)) / ordered.length) - consumed;
    parts.push(
      Array.from(
        { length: amount },
        (_, j) => narrativeWords[(consumed + j) % narrativeWords.length],
      ).join(" "),
    );
    consumed += amount;
    parts.push(ordered[i]!.text);
  }
  return {
    locale,
    words,
    name: spec.name,
    facts: spec.facts,
    text: parts.filter(Boolean).join("\r\n"),
  };
}
