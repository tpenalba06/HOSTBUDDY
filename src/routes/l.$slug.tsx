import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GuestGuide, type SectionId } from "@/components/guest/GuestGuide";
import { villaMare } from "@/components/guest/villaMare";

// Public guest experience: no login, no install.
export const Route = createFileRoute("/l/$slug")({
  head: () => ({
    meta: [
      { title: "Villa Mare — Livret d'accueil" },
      { name: "description", content: "Toutes les informations de votre séjour à la Villa Mare." },
      { property: "og:title", content: "Villa Mare — Livret d'accueil" },
      { property: "og:description", content: "Arrivée, Wi-Fi, bonnes adresses et services." },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GuestPage,
});

function GuestPage() {
  const [section, setSection] = useState<SectionId>("welcome");
  return <main className="mx-auto max-w-md px-4 py-6"><GuestGuide data={villaMare} section={section} onSection={setSection} /></main>;
}
