import { v4 } from "uuid";
import { InventoryData, Inventory } from "./types";
import { setInventory } from "./set-inventory";

export async function addInventory(data: InventoryData): Promise<Inventory> {
  const inventoryId = v4();
  return setInventory({
    ...data,
    inventoryId,
  });
}
