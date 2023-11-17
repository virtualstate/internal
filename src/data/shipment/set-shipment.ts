import { Shipment, ShipmentData } from "./types";
import { getShipmentStore } from "./store";

export async function setShipment(
  data: ShipmentData & Pick<Shipment, "shipmentId"> & Partial<Shipment>
): Promise<Shipment> {
  const store = await getShipmentStore();
  const updatedAt = new Date().toISOString();
  const document: Shipment = {
    createdAt: data.createdAt || updatedAt,
    ...data,
    updatedAt,
  };
  await store.set(data.shipmentId, document);
  return document;
}