import { getLocationStore } from "./store";

export function getLocation(id: string) {
  const store = getLocationStore();
  return store.get(id);
}
