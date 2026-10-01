import { createFileRoute, Link } from "@tanstack/react-router";
import { StartOptions } from "./app.index";

export const Route = createFileRoute("/_authenticated/app/new")({ component: NewProperty });

function NewProperty() {
  return (
    <div className="mt-6">
      <Link to="/app" className="inline-block min-h-12 py-3 font-semibold text-primary">← Mes logements</Link>
      <h1 className="text-3xl font-semibold">Ajouter un logement</h1>
      <StartOptions />
    </div>
  );
}
