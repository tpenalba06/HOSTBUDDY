export interface PlaceSearchInput { query: string; latitude?: number; longitude?: number; locale?: string }
export interface PlaceResult { id: string; name: string; address?: string; mapUrl: string; routeUrl?: string }
export interface LocalPlacesProvider { id: string; search(input: PlaceSearchInput): Promise<PlaceResult[]> }

export const localPlacesAvailability = { enabled: false, reason: "provider_not_connected" } as const;
