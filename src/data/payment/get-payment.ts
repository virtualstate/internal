import { getPaymentStore } from "./store";
import {PaymentIdentifier} from "./types";

export async function getPayment(id: PaymentIdentifier) {
  const store = getPaymentStore(id);
  return store.get(id.paymentId);
}
