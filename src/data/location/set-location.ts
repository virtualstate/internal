import { Location, LocationData } from "./types";
import { getLocationStore } from "./store";

export async function setLocation(
  data: LocationData & Pick<Location, "locationId"> & Partial<Location>
): Promise<Location> {
  const store = await getLocationStore();
  const updatedAt = new Date().toISOString();
  const document: Location = {
    createdAt: data.createdAt || updatedAt,
    ...data,
    updatedAt,
  };
  await store.set(data.locationId, document);
  return document;
}