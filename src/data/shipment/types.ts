import {Identifier} from "../identifier";

export type ShipmentStatus = "pending" | "processing" | "sent" | "delivered";

export interface ShipmentLocation {
  userId?: string;
  organisationId?: string;
  organisationText?: string; // User given text
  organisationName?: string; // Actual stored name
  locationId?: string;
  inventoryId?: string;
  inventoryItemId?: string;
  orderId?: string;
  address?: string[]; // Human-readable address
  countryCode?: string;
  saveAsUserDefault?: boolean;
  sameAsShipping?: boolean;
  name?: string;
  email?: string; // Yeah it is shipment information...
}

export interface ShipmentIdentifiers {
  identifiers?: Identifier[];
}

export interface ShipmentFrom extends ShipmentLocation, ShipmentIdentifiers {

}

export interface ShipmentTo extends ShipmentLocation, ShipmentIdentifiers {

}

export interface ShipmentData extends Record<string, unknown> {
  status: ShipmentStatus;
  // from is optional as you might receive with no info
  from?: ShipmentFrom;
  // A shipment would always have a destination
  to: ShipmentTo;
  identifiers?: Identifier[];
}

export interface Shipment extends ShipmentData {
  shipmentId: string;
  createdAt: string;
  updatedAt: string;
}
