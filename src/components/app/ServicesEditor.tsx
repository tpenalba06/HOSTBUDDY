import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listServices,
  saveService,
  listServicePhotos,
  deleteService,
  listServiceProperties,
  uploadServicePhoto,
} from "@/lib/data/operations";
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
  const properties = useQuery({
    queryKey: ["service-properties", organizationId],
    queryFn: () => listServiceProperties(organizationId),
  });
  if (query.error) return <FriendlyError />;
  return (
    <ServicesScreen
      services={query.data ?? []}
      photos={photos.data ?? []}
      loading={query.isLoading}
      propertyId={propertyId}
      properties={properties.data ?? []}
      onDelete={async (id) => {
        await deleteService(organizationId, id);
        await qc.invalidateQueries({ queryKey: ["services", organizationId] });
      }}
      onUpload={async (file) => {
        const media = await uploadServicePhoto(organizationId, propertyId, file);
        await qc.invalidateQueries({ queryKey: ["service-photos", organizationId, propertyId] });
        return media.storage_path;
      }}
      onSave={async (values) => {
        await saveService(organizationId, propertyId, values);
        await qc.invalidateQueries({ queryKey: ["services", organizationId] });
        await qc.invalidateQueries({ queryKey: ["property", propertyId] });
      }}
    />
  );
}
