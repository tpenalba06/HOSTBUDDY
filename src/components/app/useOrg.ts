import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ensureOrganization } from "@/lib/data/properties";

export const orgQuery = queryOptions({ queryKey: ["org"], queryFn: ensureOrganization, staleTime: 60_000 });
export const useOrg = () => useSuspenseQuery(orgQuery).data;
