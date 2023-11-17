import { Offer, OfferData } from "./types";
import { getOfferStore } from "./store";

export async function setOffer(
  data: OfferData & Pick<Offer, "offerId"> & Partial<Offer>
): Promise<Offer> {
  const store = await getOfferStore();
  const updatedAt = new Date().toISOString();
  const document: Offer = {
    createdAt: data.createdAt || updatedAt,
    ...data,
    updatedAt,
  };
  await store.set(data.offerId, document);
  return document;
}