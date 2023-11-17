import {listOrderItems, listOrderProducts} from "./list-order-items";
import {isOrderOfferItem} from "./is";
import {
    getOffer,
    DEFAULT_CURRENCY,
    OfferPrice,
    DEFAULT_CURRENCY_SYMBOL,
    DEFAULT_LOCALE,
    TotalOfferPrice
} from "../offer";
import {ok} from "../../is";
import {OrderItem} from "./types";

export async function getOrderPrice(orderId: string, givenItems?: OrderItem[]): Promise<TotalOfferPrice> {
    const items = givenItems ?? await listOrderItems(orderId);
    const offerItems = items.filter(isOrderOfferItem);
    const offerIds = [...new Set(
        offerItems.map(item => item.offerId)
    )];
    const offerQuantities = new Map(
        offerIds.map(
            offerId => {
                const matching = offerItems.filter(item => item.offerId === offerId);
                const quantity = matching.reduce(
                    (sum, offer) => {
                        return sum + (offer.quantity ?? 1);
                    },
                    0
                );
                return [offerId, quantity] as const;
            }
        )
    )
    const offers = await Promise.all(
        offerIds.map(offerId => getOffer(offerId))
    );
    const offerMap = new Map(
        offers.map(
            offer => [offer.offerId, offer] as const
        )
    )
    const currencies = [...new Set(
        offers.map(item => item.currencyCode || item.currency || DEFAULT_CURRENCY)
    )];
    const currencyCode = currencies[0] ?? DEFAULT_CURRENCY;
    // TODO if this is required...
    ok(currencies.length <= 1, "Expected same currency across offers");

    const price = offerIds.reduce(
        (sum, offerId) => {
            return sum + (offerQuantities.get(offerId) * (+offerMap.get(offerId).price))
        },
        0
    )

    const locale = offers[0]?.locale ?? DEFAULT_LOCALE;

    const total = (Math.round(price * 100) / 100).toFixed(2);
    
    return {
        price: total,
        total,
        currency: currencyCode,
        currencySymbol: offers[0]?.currencySymbol ?? getCurrencySymbol(locale, currencies[0]) ?? DEFAULT_CURRENCY_SYMBOL,
        currencyCode,
        countryCode: offers[0]?.countryCode
    }
}

function getCurrencySymbol(locale?: string, currency?: string) {
    if (!currency) return undefined;
    const string = (0).toLocaleString(
        locale || DEFAULT_LOCALE,
        {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }
    );
    return string.replace(/\d/g, '').trim();
}