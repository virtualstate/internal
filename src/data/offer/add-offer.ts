import { v4 } from "uuid";
import { OfferData, Offer } from "./types";
import { setOffer } from "./set-offer";

export async function addOffer(data: OfferData): Promise<Offer> {
  const offerId = v4();
  return setOffer({
    ...data,
    offerId,
  });
}
