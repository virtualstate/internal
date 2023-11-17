import { getKeyValueStore } from "../kv";
import { InventoryItem } from "./types";

const STORE_NAME = "inventoryItem" as const;

export function getInventoryItemStore(inventoryId: string) {
  return getKeyValueStore<InventoryItem>(STORE_NAME, {
    // Partition by inventoryId
    prefix: `inventoryId::${inventoryId}::`,
    counter: true
  });
}