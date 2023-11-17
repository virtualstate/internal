import { getKeyValueStore } from "../kv";
import { Shipment } from "./types";

const STORE_NAME = "shipment" as const;

export function getShipmentStore() {
  return getKeyValueStore<Shipment>(STORE_NAME, {
    counter: true
  });
}
