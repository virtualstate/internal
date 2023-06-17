import {InventoryProduct, InventoryProductIdentifierData} from "../inventory-product";

export type InventoryType =
    | "inventory"
    | "picking"
    | "packing"
    | "transit"

export interface InventoryData {
  type: InventoryType
  locationId?: string;
  products?: (InventoryProductIdentifierData & Partial<InventoryProduct>)[];
}

export interface Inventory extends InventoryData {
  inventoryId: string;
  createdAt: string;
  updatedAt: string;
}
