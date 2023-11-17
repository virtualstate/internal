import {getOrderItemStore} from "./store";
import {OrderItem} from "./types";
import {ok} from "../../is";

export async function deleteOrderItem(orderId: string, orderItemId: string) {
    const store = getOrderItemStore(orderId);
    return store.delete(orderItemId);
}

export async function deleteOrderItems(orderItems: OrderItem[]) {
    if (!orderItems.length) return;

    const orderId = orderItems[0].orderId;
    ok(
        orderItems.every(item => item.orderId === orderId),
        "Expected orderId values to match"
    );
    const ids = [...new Set(orderItems.map(item => item.orderItemId))];

    if (ids.length) {
        await Promise.all(
            ids.map(id => deleteOrderItem(orderId, id))
        );
    }
}