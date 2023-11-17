import {InventoryItem, InventoryItemIdentifierData} from "../inventory-item";

export type InventoryType =
    | "inventory"
    | "picking"
    | "packing"
    | "transit"

export interface InventoryData {
  type: InventoryType
  userId?: string;
  organisationId?: string;
  locationId?: string;
  items?: (InventoryItemIdentifierData & Partial<InventoryItem>)[];
}

export interface Inventory extends InventoryData {
  inventoryId: string;
  createdAt: string;
  updatedAt: string;
}
