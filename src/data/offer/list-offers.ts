import { Offer } from "./types";
import { getOfferStore } from "./store";

export interface ListOffersInput {
  // Only return public offers, regardless if the user is anonymous
  public?: boolean;
  productId?: string;
  organisationId?: string;
}

export async function listOffers<P extends Offer = Offer>(options: ListOffersInput = {}): Promise<
  P[]
> {
  const store = getOfferStore<P>();
  let offers = await store.values();
  if (options.organisationId) {
    offers = offers.filter(value => value.organisationId);
  }
  if (options.public) {
    // Force public only
    offers = offers.filter(value => value.public);
  }
  if (options.productId) {
    offers = offers.filter(value => value.items.find(item => item.type === "product" ? item.productId === options.productId : false))
  }
  return offers;
}
