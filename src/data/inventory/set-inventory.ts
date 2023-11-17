import { Inventory, InventoryData } from "./types";
import { getInventoryStore } from "./store";
import {v4} from "uuid";
import {SetInventoryItem, setInventoryItems} from "../inventory-item";

export async function setInventory(
  data: InventoryData & Pick<Inventory, "inventoryId"> & Partial<Inventory>
): Promise<Inventory> {
  const store = await getInventoryStore();
  const updatedAt = new Date().toISOString();
  const document: Inventory = {
    createdAt: data.createdAt || updatedAt,
    ...data,
    updatedAt,
  };
  await store.set(data.inventoryId, document);
  if (data.items) {
    await setInventoryItems(data.items.map((product): SetInventoryItem => ({
      ...product,
      inventoryId: data.inventoryId,
      inventoryItemId: product.inventoryItemId || v4()
    })));
  }
  return document;
}