import {Inventory, InventoryType} from "./types";
import { getInventoryStore } from "./store";

export interface ListInventoryInput {
  type?: InventoryType;
  organisationId?: string;
  userId?: string;
}

export async function listInventory({ type = "inventory", organisationId, userId }: ListInventoryInput = {}): Promise<
  Inventory[]
> {
  const store = getInventoryStore();
  let values = await store.values();
  if (organisationId) {
    values = values.filter(value => value.organisationId === organisationId)
  }
  if (userId) {
    values = values.filter(value => value.userId === userId)
  }
  if (type) {
    values = values.filter(value => value.type === type);
  }
  return values;
}
