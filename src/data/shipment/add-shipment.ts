import { v4 } from "uuid";
import { ShipmentData, Shipment } from "./types";
import { setShipment } from "./set-shipment";

export async function addShipment(data: ShipmentData): Promise<Shipment> {
  const shipmentId = v4();
  return setShipment({
    ...data,
    shipmentId,
  });
}
