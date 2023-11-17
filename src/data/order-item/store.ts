import { getKeyValueStore } from "../kv";
import { OrderItem } from "./types";

const STORE_NAME = "orderItem" as const;

export function getOrderItemStore(orderId: string) {
  return getKeyValueStore<OrderItem>(STORE_NAME, {
    // Partition by orderId
    prefix: `orderId::${orderId}::`,
    counter: true
  });
}