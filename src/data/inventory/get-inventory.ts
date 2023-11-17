import { getInventoryStore } from "./store";

export function getInventory(id: string) {
  const store = getInventoryStore();
  return store.get(id);
}
