import {getOrderItemStore} from "./store";

export async function getOrderItem(orderId: string, orderItemId: string) {
    const store = await getOrderItemStore(orderId);
    return store.get(orderItemId);
}