import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listServices, saveService, listServicePhotos } from "@/lib/data/operations";
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
  const photos = useQuery({
    queryKey: ["service-photos", organizationId, propertyId],
    queryFn: () => listServicePhotos(organizationId, propertyId),
  });
  if (query.error) return <FriendlyError />;
  return (
    <ServicesScreen
      services={query.data ?? []}
      photos={photos.data ?? []}
      loading={query.isLoading}
      onSave={async (values) => {
        await saveService(organizationId, propertyId, values);
        await qc.invalidateQueries({ queryKey: key });
        await qc.invalidateQueries({ queryKey: ["property", propertyId] });
      }}
    />
  );
}
