export const villaMare = {
  name: "Villa Mare",
  host: "Conciergerie Azur",
  phone: "+33612345678",
  email: "bonjour@conciergerie-azur.fr",
  wifi: { network: "VillaMare_5G", password: "soleil2026" },
  arrival: "Arrivée à partir de 16h. La boîte à clés est à droite du portail, code 1907.",
  house: "4 chambres, cuisine équipée, climatisation dans chaque pièce. Le lave-linge est dans le cellier.",
  pool: "Ouverte de 9h à 21h. Merci de prendre une douche avant la baignade. Pas de verre au bord.",
  places: [
    { name: "Plage de la Garoupe", note: "5 min en voiture" },
    { name: "Boulangerie Lou Fournil", note: "Croissants dès 7h" },
    { name: "Restaurant Le Cabanon", note: "Poisson du jour, réserver" },
  ],
  services: [
    { id: "bf", name: "Petit-déjeuner", price: 25, desc: "Livré à 8h30, pour 2 personnes" },
    { id: "ms", name: "Massage à domicile", price: 90, desc: "1 heure, au bord de la piscine" },
    { id: "tr", name: "Transfert", price: 60, desc: "Aéroport de Nice ↔ villa" },
    { id: "lc", name: "Départ tardif", price: 35, desc: "Profitez de la villa jusqu'à 14h" },
  ],
  departure: "Départ avant 11h. Lancez le lave-vaisselle, fermez les volets et laissez les clés dans la boîte.",
};
export type GuideData = typeof villaMare;
