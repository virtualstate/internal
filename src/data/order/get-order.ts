import { getOrderStore } from "./store";
import {listOrderItems, listOrderProducts, listOrderServices, OrderItem} from "../order-item";
import {v4, v5} from "uuid";
import {createHash} from "crypto";
import {ok} from "../../is";
import {addExpiring, deleteCached, getCached} from "../cache";
import {DAY_MS, getExpiresAt} from "../expiring-kv";
import {Order} from "./types";
import {setOrder} from "./set-order";
import {ShipmentLocation} from "../shipment";
import {isOrderShipmentLocationMatch} from "./list-orders";
import {getOrderPrice} from "../order-item/get-order-item-info";

const PENDING_ORDER_ID = "PendingOrder";
const PENDING_ORDER_EXPIRES_IN = 7 * DAY_MS;

export async function getOrder(id: string, location?: ShipmentLocation): Promise<Order> {
  const order = await getBaseOrder(id, location);
  return getOrderInfo(order);
}

async function getBaseOrder(id: string, location?: ShipmentLocation): Promise<Order> {
  const store = getOrderStore();
  const order = await store.get(id);
  if (!order) return undefined;
  if (location && !isOrderShipmentLocationMatch(order, location)) return undefined;
  return order;
}

export async function getOrderInfo(order: Order): Promise<Order> {
  const items = order.items ?? await listOrderItems(order.orderId);
  const products = order.products ?? await listOrderProducts(order.orderId, true, items)
  const services = order.services ?? await listOrderServices(order.orderId, true, items)
  const price = order.total ? order : await getOrderPrice(order.orderId, items);
  return {
    ...price,
    ...order,
    items,
    products,
    services
  }
}

function getUserPendingOrderCacheKey(userId: string) {
  return `${PENDING_ORDER_ID}::${userId}`;
}

// Gets an existing orderId, or creates a new one
export async function getUserPendingOrderId(userId: string): Promise<string> {
  const key = getUserPendingOrderCacheKey(userId);
  const cached = await getCached(key, true);
  if (cached) return cached;
  const { orderId } = await getUserPendingOrder(userId, false);
  return orderId;
}

export async function getUserPendingOrder(userId: string, loadItems = true): Promise<Order> {
  const key = getUserPendingOrderCacheKey(userId);
  const cached = await getCached(key, true);
  const orderId = cached ?? v4();
  let order = await getBaseOrder(orderId, {
    userId
  });
  if (order) {
    if (order.status !== "pending") {
      console.log("Getting new pending order, previous no longer pending");
      await deleteCached(key, true);
      return getUserPendingOrder(userId);
    }
  } else {
    console.log("Creating new pending order");
    order = await setOrder({
      orderId,
      status: "pending",
      to: {
        userId
      }
    });

    await addExpiring({
      key,
      value: orderId,
      expiresAt: getExpiresAt(PENDING_ORDER_EXPIRES_IN),
      stable: true
    });
  }
  return getOrderInfo(order);
5}