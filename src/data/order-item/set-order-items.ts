import {getOrderItemStore} from "./store";
import {OrderItem, SetOrderItem} from "./types";
import {v4} from "uuid";
import {ok} from "../../is";

export async function setOrderItem(data: SetOrderItem): Promise<OrderItem> {
  const store = await getOrderItemStore(data.orderId);
  const updatedAt = new Date().toISOString();
  const orderItemId = data.orderItemId || v4();
  const orderId = data.orderId;
  ok(orderId, "Expected orderId for setOrderItem");
  const document: OrderItem = {
    createdAt: data.createdAt || updatedAt,
    ...data,
    quantity: data.quantity ?? 1, // Notice ?? use
    identifiers: data.identifiers ?? [],
    updatedAt,
    orderItemId,
    orderId
  };
  await store.set(orderItemId, document);
  return document;
}

export async function setOrderItems(items: SetOrderItem[]): Promise<OrderItem[]> {
  const result: OrderItem[] = [];
  // Add in serial... it's not needing to be fast right now
  for (const data of items) {
    result.push(await setOrderItem(data));
  }
  return result;
}