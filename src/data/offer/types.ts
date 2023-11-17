import {Identifier} from "../identifier";
import {ShipmentFrom, ShipmentTo} from "../shipment";


export type MaybeNumberString = `${number}` | string;

export interface OfferPrice {
  price: MaybeNumberString;
  locale?: string;
  currency: string;
  currencyCode?: string;
  currencySymbol?: string;
  countryCode?: string;
}

export interface TotalOfferPrice extends OfferPrice {
  total?: MaybeNumberString;
}

export interface ProductOfferItem {
  type: "product";
  productId: string;
  quantity?: number;
  identifiers?: Identifier[];
}

export interface ServiceOfferItem {
  type: "service";
  serviceId: string;
  quantity?: number;
  identifiers?: Identifier[];
}

export type OfferItem =
    | ProductOfferItem
    | ServiceOfferItem

export type OfferItemType = OfferItem["type"];

export type OfferStatus =
    | "speculative"
    | "preSale"
    | "preOrder"
    | "onlineOnly"
    | "storeOnly"
    | "available"
    | "backOrder"
    | "limitedAvailability"
    | "soldOut"
    | "void"
    | string;

export interface OfferData extends Record<string, unknown>, Partial<OfferPrice> {
  status: OfferStatus;
  items: OfferItem[];
  // The user that is providing this offer
  userId?: string;
  // The organisation that is providing this offer
  organisationId?: string;
  offerName?: string;
  // Is the offer publicly visible
  public?: boolean;
  countryCode?: string;
  // Offer can be from one party to another
  from?: ShipmentFrom;
  to?: ShipmentTo;
}

export interface Offer extends OfferData {
  offerId: string;
  createdAt: string;
  updatedAt: string;
}
