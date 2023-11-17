import { v4 } from "uuid";
import { InventoryItem, InventoryItemData } from "./types";
import {setInventoryItem, setInventoryItems} from "./set-inventory-items";

export async function addInventoryItem(data: InventoryItemData): Promise<InventoryItem> {
  return setInventoryItem({
    ...data,
    inventoryItemId: v4()
  });
}

export async function addInventoryItems(data: InventoryItemData[]): Promise<InventoryItem[]> {
  return setInventoryItems(data.map(data => ({
    ...data,
    inventoryItemId: v4()
  })));
}
