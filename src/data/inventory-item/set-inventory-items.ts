import {getInventoryItemStore} from "./store";
import {InventoryItem, SetInventoryItem} from "./types";
import {v4} from "uuid";

export async function setInventoryItem(data: SetInventoryItem): Promise<InventoryItem> {
  const store = await getInventoryItemStore(data.inventoryId);
  const updatedAt = new Date().toISOString();
  const inventoryItemId = data.inventoryItemId || v4();
  const document: InventoryItem = {
    createdAt: data.createdAt || updatedAt,
    ...data,
    quantity: data.quantity ?? 1, // Notice ?? use
    identifiers: data.identifiers ?? [],
    updatedAt,
    inventoryItemId,
  };
  await store.set(inventoryItemId, document);
  return document;
}

export async function setInventoryItems(items: SetInventoryItem[]): Promise<InventoryItem[]> {
  const result: InventoryItem[] = [];
  // Add in serial... it's not needing to be fast right now
  for (const data of items) {
    result.push(await setInventoryItem(data));
  }
  return result;
}