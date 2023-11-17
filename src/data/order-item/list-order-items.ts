import {OrderItem, OrderProductItem, OrderServiceItem} from "./types";
import { getOrderItemStore } from "./store";
import {getOffer} from "../offer";
import {isOrderOfferItem, isOrderProductItem, isOrderServiceItem, isProductOfferItem, isServiceOfferItem} from "./is";

export async function listOrderItems(orderId: string): Promise<
    OrderItem[]
> {
  const store = getOrderItemStore(orderId);
  return store.values();
}

export async function listOrderProducts(orderId: string, offers = true, orderItems?: OrderItem[]): Promise<OrderProductItem[]> {
    const items = orderItems ?? await listOrderItems(orderId);
    const products = items.filter(isOrderProductItem);
    if (!offers) return products;
    const {
        quantities,
        uniqueOffers
    } = getOfferItemInfo(items);
    const offerProducts = await Promise.all(
        uniqueOffers
            .map(async (item): Promise<OrderProductItem[]> => {
                const offer = await getOffer(item.offerId);
                return offer.items
                    .filter(isProductOfferItem)
                    .map((offer): OrderProductItem => ({
                        ...item,
                        orderId,
                        productId: offer.productId,
                        quantity: (offer.quantity ?? 1) * (quantities[item.offerId] ?? 1),
                        identifiers: offer.identifiers,
                    }))
            })
    );

    return offerProducts
        .flatMap<OrderProductItem>(value => value)
        .concat(products);
}

function getOfferItemInfo(items: OrderItem[]) {
    const offerItems = items
        .filter(isOrderOfferItem);

    const offerIds = [...new Set(offerItems.map(item => item.offerId))];
    const quantities = Object.fromEntries(
        offerIds.map(
            (offerId) => {
                const sum = offerItems.filter(item => item.offerId === offerId).reduce(
                    (sum, item) => sum + (item.quantity ?? 1),
                    0
                );
                return [offerId, sum] as const;
            }
        )
    )

    const uniqueOffers = offerIds
        .map(offerId => offerItems.find(item => item.offerId === offerId))

    return {
        quantities,
        uniqueOffers
    }
}

export async function listOrderServices(orderId: string, offers = true, orderItems?: OrderItem[]): Promise<OrderServiceItem[]> {
    const items = orderItems ?? await listOrderItems(orderId);
    const services = items.filter(isOrderServiceItem);
    if (!offers) return services;
    const {
        quantities,
        uniqueOffers
    } = getOfferItemInfo(items);
    const offerServices = await Promise.all(
        uniqueOffers
            .map(async (item): Promise<OrderServiceItem[]> => {
                const offer = await getOffer(item.offerId);
                return offer.items
                    .filter(isServiceOfferItem)
                    .map((offer): OrderServiceItem => ({
                        ...item,
                        orderId,
                        serviceId: offer.serviceId,
                        quantity: (offer.quantity ?? 1) * (quantities[item.offerId] ?? 1),
                        identifiers: offer.identifiers,
                    }))
            })
    );

    return offerServices
        .flatMap<OrderServiceItem>(value => value)
        .concat(services);
}