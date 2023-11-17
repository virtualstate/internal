export type LocationType =
    | "place"
    | "inventory"
    | "packing"
    | "picking"

export interface LocationData extends Record<string, unknown> {
  type: LocationType
  locationName?: string;
  address?: string[];
  countryCode?: string;
  organisationId?: string;
  userId?: string;
}

export interface Location extends LocationData {
  locationId: string;
  createdAt: string;
  updatedAt: string;
}
