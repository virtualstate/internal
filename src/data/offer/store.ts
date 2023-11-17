import { getKeyValueStore } from "../kv";
import { Offer } from "./types";

const STORE_NAME = "offer" as const;

export function getOfferStore<P extends Offer = Offer>() {
  return getKeyValueStore<P>(STORE_NAME, {
    counter: true
  });
}
