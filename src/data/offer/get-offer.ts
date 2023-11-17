import { getOfferStore } from "./store";
import {Offer} from "./types";

export function getOffer<P extends Offer = Offer>(id: string) {
  const store = getOfferStore<P>();
  return store.get(id);
}
