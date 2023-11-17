import {Identifier} from "../identifier";
import {ShipmentFrom, ShipmentTo} from "../shipment";

export type InventoryItemStatus =
    | "pending"
    | "available"
    | "processing"
    | "split"
    | "void";

export interface InventoryItemIdentifierData {
  productId?: string;
  offerId?: string; // Allows a bundled offer to be stored as inventory
  quantity?: number; // Default 1
  identifiers?: Identifier[]; // Default []
}

export interface InventoryItemData extends InventoryItemIdentifierData {
  inventoryId: string;
  status?: InventoryItemStatus;
  // Record where it came from and was sent to
  from?: ShipmentFrom;
  to?: ShipmentTo | ShipmentTo[];
}

export interface InventoryItem extends InventoryItemData {
  inventoryItemId: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryProduct extends InventoryItem {
  productId: string;
}

export interface InventoryOffer extends InventoryItem {
  offerId: string;
}

export type SetInventoryItem = InventoryItemData & Pick<InventoryItem, "inventoryId" | "inventoryItemId"> & Partial<InventoryItem>;