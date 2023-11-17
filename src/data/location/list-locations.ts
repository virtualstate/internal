import { Location } from "./types";
import { getLocationStore } from "./store";

export interface ListLocationsInput {}

export async function listLocations({}: ListLocationsInput = {}): Promise<
  Location[]
> {
  const store = getLocationStore();
  return store.values();
}
