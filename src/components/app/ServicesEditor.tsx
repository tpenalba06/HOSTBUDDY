import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listServices, saveService } from "@/lib/data/operations";
import { friendlyMessage } from "./Friendly";

type Draft = { id?: string; name: string; description: string; price: string; pricingType: "fixed" | "per_person"; isActive: boolean };
const empty: Draft = { name: "", description: "", price: "", pricingType: "fixed", isActive: true };

export function ServicesEditor({ organizationId, propertyId }: { organizationId: string; propertyId: string }) {
  const qc = useQueryClient();
  const key = ["services", organizationId, propertyId];
  const query = useQuery({ queryKey: key, queryFn: () => listServices(organizationId, propertyId), staleTime: 30_000 });
  const [draft, setDraft] = useState<Draft>(empty);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: () => saveService(organizationId, propertyId, { ...draft, price: Number(draft.price) }),
    onSuccess: async () => { setNotice("Enregistré · visible dans le guide"); setError(""); setDraft(empty); setOpen(false); await qc.invalidateQueries({ queryKey: key }); },
    onError: (reason) => setError(friendlyMessage(reason)),
  });
  return <section>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-bold text-primary">Services voyageurs</p><h2 className="mt-1 text-3xl font-semibold">Vos services</h2><p className="mt-1 text-muted-foreground">Les voyageurs envoient une demande. Aucun paiement n’est présenté comme effectué.</p></div><Button onClick={() => setOpen(!open)}><Plus/>Ajouter un service</Button></div>
    {open && <form className="surface mt-5 space-y-4 p-5" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><label className="block"><span className="mb-1 block font-semibold">Nom</span><input className="field" required maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })}/></label><label className="block"><span className="mb-1 block font-semibold">Description</span><textarea className="field min-h-28" maxLength={1000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })}/></label><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1 block font-semibold">Prix en euros</span><input className="field" required type="number" min="0" step="0.01" inputMode="decimal" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })}/></label><label><span className="mb-1 block font-semibold">Tarification</span><select className="field" value={draft.pricingType} onChange={(event) => setDraft({ ...draft, pricingType: event.target.value as Draft["pricingType"] })}><option value="fixed">Prix fixe</option><option value="per_person">Par personne</option></select></label></div><label className="flex min-h-14 items-center justify-between rounded-lg bg-muted px-4"><span className="font-semibold">Visible dans le guide</span><input className="h-6 w-6 accent-primary" type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}/></label>{error&&<p role="alert" className="rounded-lg bg-warning-soft p-3">{error}</p>}<Button className="w-full" disabled={save.isPending}>{save.isPending?"Enregistrement…":"Enregistrer le service"}</Button></form>}
    {notice&&<p className="mt-4 flex items-center gap-2 rounded-lg bg-success-soft p-3 text-success"><Check/>{notice}</p>}
    <div className="mt-6 space-y-3">{query.data?.map((service) => <article key={service.id} className="surface flex items-center justify-between gap-4 p-4"><div><p className="font-bold">{service.name}</p><p className="text-sm text-muted-foreground">{Number(service.price).toFixed(2)} € · {service.pricing_type === "per_person" ? "par personne" : "prix fixe"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${service.is_active?"bg-success-soft text-success":"bg-muted text-muted-foreground"}`}>{service.is_active?"Visible":"Masqué"}</span></article>)}{!query.isLoading&&!query.data?.length&&<p className="rounded-lg bg-muted p-4 text-muted-foreground">Aucun service ajouté.</p>}</div>
  </section>;
}