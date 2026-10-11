import type { Locale } from "@/lib/i18n";

const localized = {
  fr: {
    host: "Conciergerie Azur",
    arrival: "Arrivée à partir de 16 h. La boîte à clés est à droite du portail, code 1907.",
    house:
      "4 chambres, cuisine équipée et climatisation dans chaque pièce. Le lave-linge est dans le cellier.",
    pool: "Ouverte de 9 h à 21 h. Merci de prendre une douche avant la baignade. Pas de verre au bord.",
    departure:
      "Départ avant 11 h. Lancez le lave-vaisselle, fermez les volets et laissez les clés dans la boîte.",
    places: [
      ["Plage de la Garoupe", "5 min en voiture"],
      ["Boulangerie Lou Fournil", "Croissants dès 7 h"],
      ["Restaurant Le Cabanon", "Poisson du jour, réservation conseillée"],
    ],
    services: [
      ["Petit-déjeuner", "Livré à 8 h 30, pour 2 personnes"],
      ["Massage à domicile", "1 heure, au bord de la piscine"],
      ["Transfert", "Aéroport de Nice ↔ villa"],
      ["Départ tardif", "Profitez de la villa jusqu’à 14 h"],
    ],
  },
  en: {
    host: "Azur Concierge",
    arrival: "Check-in from 4 pm. The key box is to the right of the gate, code 1907.",
    house:
      "4 bedrooms, fully equipped kitchen and air conditioning in every room. The washing machine is in the utility room.",
    pool: "Open from 9 am to 9 pm. Please shower before swimming. No glass by the pool.",
    departure:
      "Check out before 11 am. Start the dishwasher, close the shutters and leave the keys in the box.",
    places: [
      ["Garoupe Beach", "5 minutes by car"],
      ["Lou Fournil Bakery", "Croissants from 7 am"],
      ["Le Cabanon Restaurant", "Catch of the day, booking advised"],
    ],
    services: [
      ["Breakfast", "Delivered at 8:30 am, for 2 guests"],
      ["In-home massage", "1 hour by the pool"],
      ["Transfer", "Nice Airport ↔ villa"],
      ["Late checkout", "Enjoy the villa until 2 pm"],
    ],
  },
  es: {
    host: "Conserjería Azur",
    arrival:
      "Llegada a partir de las 16:00. La caja de llaves está a la derecha del portal, código 1907.",
    house:
      "4 dormitorios, cocina equipada y aire acondicionado en todas las habitaciones. La lavadora está en el lavadero.",
    pool: "Abierta de 9:00 a 21:00. Dúchese antes de bañarse. No use vidrio junto a la piscina.",
    departure:
      "Salida antes de las 11:00. Ponga el lavavajillas, cierre las persianas y deje las llaves en la caja.",
    places: [
      ["Playa de la Garoupe", "5 minutos en coche"],
      ["Panadería Lou Fournil", "Cruasanes desde las 7:00"],
      ["Restaurante Le Cabanon", "Pescado del día, se recomienda reservar"],
    ],
    services: [
      ["Desayuno", "Entrega a las 8:30, para 2 personas"],
      ["Masaje a domicilio", "1 hora junto a la piscina"],
      ["Traslado", "Aeropuerto de Niza ↔ villa"],
      ["Salida tardía", "Disfrute de la villa hasta las 14:00"],
    ],
  },
  de: {
    host: "Concierge Azur",
    arrival: "Anreise ab 16 Uhr. Der Schlüsselkasten befindet sich rechts am Tor, Code 1907.",
    house:
      "4 Schlafzimmer, ausgestattete Küche und Klimaanlage in jedem Zimmer. Die Waschmaschine steht im Hauswirtschaftsraum.",
    pool: "Geöffnet von 9 bis 21 Uhr. Bitte vor dem Schwimmen duschen. Kein Glas am Pool.",
    departure:
      "Abreise bis 11 Uhr. Geschirrspüler starten, Fensterläden schließen und Schlüssel in die Box legen.",
    places: [
      ["Strand La Garoupe", "5 Minuten mit dem Auto"],
      ["Bäckerei Lou Fournil", "Croissants ab 7 Uhr"],
      ["Restaurant Le Cabanon", "Tagesfisch, Reservierung empfohlen"],
    ],
    services: [
      ["Frühstück", "Lieferung um 8:30 Uhr, für 2 Personen"],
      ["Massage zu Hause", "1 Stunde am Pool"],
      ["Transfer", "Flughafen Nizza ↔ Villa"],
      ["Später Check-out", "Villa bis 14 Uhr genießen"],
    ],
  },
  it: {
    host: "Concierge Azur",
    arrival: "Arrivo dalle 16:00. La cassetta delle chiavi è a destra del cancello, codice 1907.",
    house:
      "4 camere, cucina attrezzata e aria condizionata in ogni stanza. La lavatrice è nel ripostiglio.",
    pool: "Aperta dalle 9:00 alle 21:00. Fare la doccia prima di entrare. Niente vetro a bordo piscina.",
    departure:
      "Partenza entro le 11:00. Avvia la lavastoviglie, chiudi le persiane e lascia le chiavi nella cassetta.",
    places: [
      ["Spiaggia della Garoupe", "5 minuti in auto"],
      ["Panetteria Lou Fournil", "Croissant dalle 7:00"],
      ["Ristorante Le Cabanon", "Pesce del giorno, prenotazione consigliata"],
    ],
    services: [
      ["Colazione", "Consegnata alle 8:30, per 2 persone"],
      ["Massaggio a domicilio", "1 ora a bordo piscina"],
      ["Transfer", "Aeroporto di Nizza ↔ villa"],
      ["Check-out posticipato", "Goditi la villa fino alle 14:00"],
    ],
  },
  pt: {
    host: "Concierge Azur",
    arrival:
      "Chegada a partir das 16:00. A caixa das chaves fica à direita do portão, código 1907.",
    house:
      "4 quartos, cozinha equipada e ar condicionado em todas as divisões. A máquina de lavar está na lavandaria.",
    pool: "Aberta das 9:00 às 21:00. Tome duche antes de nadar. Não use vidro junto à piscina.",
    departure:
      "Saída até às 11:00. Ligue a máquina da loiça, feche as persianas e deixe as chaves na caixa.",
    places: [
      ["Praia da Garoupe", "5 minutos de carro"],
      ["Padaria Lou Fournil", "Croissants a partir das 7:00"],
      ["Restaurante Le Cabanon", "Peixe do dia, reserva aconselhada"],
    ],
    services: [
      ["Pequeno-almoço", "Entrega às 8:30, para 2 pessoas"],
      ["Massagem ao domicílio", "1 hora junto à piscina"],
      ["Transfer", "Aeroporto de Nice ↔ villa"],
      ["Saída tardia", "Desfrute da villa até às 14:00"],
    ],
  },
} as const;
export function getVillaMare(locale: Locale) {
  const d = localized[locale];
  return {
    name: "Villa Mare",
    host: d.host,
    phone: "+33612345678",
    email: "bonjour@conciergerie-azur.fr",
    wifi: { network: "VillaMare_5G", password: "soleil2026" },
    arrival: d.arrival,
    house: d.house,
    pool: d.pool,
    places: d.places.map(([name, note]) => ({ name, note })),
    services: d.services.map(([name, desc], i) => ({
      id: ["bf", "ms", "tr", "lc"][i] ?? String(i),
      name,
      price: [25, 90, 60, 35][i] ?? 0,
      desc,
    })),
    departure: d.departure,
  };
}
export const villaMare = getVillaMare("fr");
export type GuideData = ReturnType<typeof getVillaMare>;
