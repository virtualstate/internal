import {OrderItem, OrderOfferItem, OrderProductItem, OrderServiceItem} from "./types";
import {OfferItem, ProductOfferItem, ServiceOfferItem} from "../offer";

export function isOrderProductItem(item: OrderItem): item is OrderProductItem {
    return !!item.productId;
}

export function isOrderServiceItem(item: OrderItem): item is OrderServiceItem {
    return !!item.serviceId;
}

export function isOrderOfferItem(item: OrderItem): item is OrderOfferItem {
    return !!item.offerId;
}

export function isProductOfferItem(item: OfferItem): item is ProductOfferItem {
    return item.type === "product";
}

export function isServiceOfferItem(item: OfferItem): item is ServiceOfferItem {
    return item.type === "service";
}