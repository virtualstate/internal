import { v4 } from "uuid";
import { OrderData, Order } from "./types";
import { setOrder } from "./set-order";

export async function addOrder(data: OrderData): Promise<Order> {
  const orderId = v4();
  return setOrder({
    ...data,
    orderId,
  });
}
