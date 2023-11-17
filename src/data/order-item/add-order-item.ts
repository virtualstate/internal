import { v4 } from "uuid";
import { OrderItem, OrderItemData } from "./types";
import {setOrderItem, setOrderItems} from "./set-order-items";
import {getUserPendingOrderId} from "../order";

export async function addOrderItem(data: OrderItemData): Promise<OrderItem> {
  return setOrderItem({
    ...data,
    orderItemId: v4()
  });
}

export async function addOrderItems(data: OrderItemData[]): Promise<OrderItem[]> {
  return setOrderItems(data.map(data => ({
    ...data,
    orderItemId: v4()
  })));
}

export async function addOrderItemToUserPendingOrder(userId: string, data: Omit<OrderItemData, "orderId">): Promise<OrderItem> {
  const orderId = await getUserPendingOrderId(userId);
  return addOrderItem({
    ...data,
    orderId
  });
}