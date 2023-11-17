import { Order, OrderData } from "./types";
import { getOrderStore } from "./store";
import {setOrderItems} from "../order-item";
import {v4} from "uuid";

export async function setOrder(
  data: OrderData & Partial<Order>
): Promise<Order> {
  const store = await getOrderStore();
  const updatedAt = new Date().toISOString();
  const orderId = data.orderId || v4();
  const document: Order = {
    createdAt: data.createdAt || updatedAt,
    ...data,
    orderId,
    // Don't store the products on the order itself
    items: undefined,
    products: undefined,
    updatedAt,
  };
  await store.set(data.orderId, document);
  if (data.items) {
    await setOrderItems(data.items.map(product => ({
      ...product,
      orderId: data.orderId,
      orderItemId: product.orderItemId || v4()
    })));
  }
  return document;
}