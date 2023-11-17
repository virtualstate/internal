import { getKeyValueStore } from "../kv";
import { Order } from "./types";

const STORE_NAME = "order" as const;

export function getOrderStore() {
  return getKeyValueStore<Order>(STORE_NAME, {
    counter: true
  });
}