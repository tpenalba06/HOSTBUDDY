import { useRouter } from "@tanstack/react-router";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";

export function FriendlyError({ message }: { message?: string }) {
  const router = useRouter();
  const { reset } = useQueryErrorResetBoundary();
  return (
    <div className="surface mt-10 p-6 text-center">
      <p className="text-4xl">🌥️</p>
      <h2 className="mt-2 text-2xl font-semibold">Un petit souci de connexion</h2>
      <p className="mt-2">{message ?? "Votre connexion a été interrompue. Vos informations déjà enregistrées sont conservées."}</p>
      <button className="btn btn-primary mt-6 w-full" onClick={() => { reset(); router.invalidate(); }}>Réessayer</button>
    </div>
  );
}

export function Loading({ label = "Chargement…" }: { label?: string }) {
  return <p className="mt-16 animate-pulse text-center text-lg text-muted-foreground">{label}</p>;
}

export const friendlyMessage = (e: unknown) =>
  e instanceof Error && e.constructor.name === "FriendlyError" ? e.message : "Votre connexion a été interrompue. Vos informations déjà enregistrées sont conservées.";
