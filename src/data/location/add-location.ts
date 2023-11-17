import { v4 } from "uuid";
import { LocationData, Location } from "./types";
import { setLocation } from "./set-location";

export async function addLocation(data: LocationData): Promise<Location> {
  const locationId = v4();
  return setLocation({
    ...data,
    locationId,
  });
}
