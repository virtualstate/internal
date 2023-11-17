import { getShipmentStore } from "./store";

export function getShipment(id: string) {
  const store = getShipmentStore();
  return store.get(id);
}
