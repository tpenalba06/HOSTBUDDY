import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listServices, saveService } from "@/lib/data/operations";
import { ServicesScreen } from "./ServicesScreen";
import { FriendlyError } from "./Friendly";

export function ServicesEditor({
  organizationId,
  propertyId,
}: {
  organizationId: string;
  propertyId: string;
}) {
  const qc = useQueryClient();
  const key = ["services", organizationId, propertyId];
  const query = useQuery({
    queryKey: key,
    queryFn: () => listServices(organizationId, propertyId),
    staleTime: 30_000,
  });
  if (query.error) return <FriendlyError />;
  return (
    <ServicesScreen
      services={query.data ?? []}
      loading={query.isLoading}
      onSave={async (values) => {
        await saveService(organizationId, propertyId, values);
        await qc.invalidateQueries({ queryKey: key });
      }}
    />
  );
}
