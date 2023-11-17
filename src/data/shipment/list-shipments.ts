import { Shipment } from "./types";
import { getShipmentStore } from "./store";

export interface ListShipmentsInput {}

export async function listShipments({}: ListShipmentsInput = {}): Promise<
  Shipment[]
> {
  const store = getShipmentStore();
  return store.values();
}
