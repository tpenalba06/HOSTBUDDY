// Canonical field catalogue: labels, categories, questions and guide sections.
export interface FieldDef {
  key: string;
  label: string;
  category: string;
  essential: boolean;
  question: string;
  section: { key: string; title: string; icon: string; order: number };
}

const S = {
  welcome: { key: "welcome", title: "Bienvenue", icon: "👋", order: 0 },
  arrival: { key: "arrival", title: "Mon arrivée", icon: "🔑", order: 1 },
  wifi: { key: "wifi", title: "Wi-Fi", icon: "📶", order: 2 },
  house: { key: "house", title: "La maison", icon: "🏡", order: 3 },
  pool: { key: "pool", title: "Piscine", icon: "🏊", order: 4 },
  places: { key: "places", title: "Bonnes adresses", icon: "📍", order: 5 },
  services: { key: "services", title: "Services", icon: "✨", order: 6 },
  departure: { key: "departure", title: "Mon départ", icon: "🧳", order: 7 },
  contact: { key: "contact", title: "Contact", icon: "💬", order: 8 },
};

export const FIELD_DEFS: FieldDef[] = [
  { key: "description", label: "Description", category: "general", essential: false, question: "Décrivez votre logement en quelques mots.", section: S.welcome },
  { key: "address", label: "Adresse", category: "location", essential: true, question: "Quelle est l'adresse du logement ?", section: S.arrival },
  { key: "arrival", label: "Heure d'arrivée", category: "arrival", essential: true, question: "À partir de quelle heure vos voyageurs peuvent-ils arriver ?", section: S.arrival },
  { key: "access", label: "Clés et accès", category: "access", essential: true, question: "Comment vos voyageurs entrent-ils dans le logement ? (clés, boîte, code…)", section: S.arrival },
  { key: "parking", label: "Parking", category: "parking", essential: true, question: "Où vos voyageurs peuvent-ils se garer ?", section: S.arrival },
  { key: "wifi", label: "Wi-Fi", category: "wifi", essential: true, question: "Quel est le nom et le mot de passe du Wi-Fi ?", section: S.wifi },
  { key: "capacity", label: "Capacité et chambres", category: "capacity", essential: false, question: "Combien de voyageurs et de chambres ?", section: S.house },
  { key: "equipment", label: "Équipements", category: "equipment", essential: false, question: "Quels équipements sont disponibles ?", section: S.house },
  { key: "kitchen", label: "Cuisine", category: "kitchen", essential: false, question: "Des informations sur la cuisine ?", section: S.house },
  { key: "climate", label: "Chauffage et climatisation", category: "climate", essential: false, question: "Comment fonctionnent le chauffage ou la climatisation ?", section: S.house },
  { key: "rules", label: "Règles de la maison", category: "rules", essential: false, question: "Quelles sont les règles de la maison ?", section: S.house },
  { key: "trash", label: "Déchets et tri", category: "trash", essential: false, question: "Où jeter les poubelles ?", section: S.house },
  { key: "pool", label: "Piscine / spa", category: "pool", essential: false, question: "Y a-t-il des consignes pour la piscine ou le spa ?", section: S.pool },
  { key: "recommendations", label: "Bonnes adresses", category: "recommendations", essential: false, question: "Quelles adresses recommandez-vous ?", section: S.places },
  { key: "services", label: "Services proposés", category: "services", essential: false, question: "Proposez-vous des services (ménage, petit-déjeuner…) ?", section: S.services },
  { key: "departure", label: "Départ", category: "departure", essential: true, question: "À quelle heure et comment se passe le départ ?", section: S.departure },
  { key: "contact", label: "Contact", category: "contact", essential: true, question: "Comment vos voyageurs peuvent-ils vous joindre ? (téléphone, e-mail)", section: S.contact },
  { key: "emergency", label: "Urgences", category: "emergency", essential: false, question: "Un numéro en cas d'urgence ?", section: S.contact },
];

export const FIELD_BY_KEY = Object.fromEntries(FIELD_DEFS.map((f) => [f.key, f]));
