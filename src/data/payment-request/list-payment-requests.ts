import { PaymentRequest, PaymentRequestOwnerIdentifiers } from "./types";
import { getPaymentRequestStore } from "./store";

export interface ListPaymentRequestsInput extends PaymentRequestOwnerIdentifiers {

}

export async function listPaymentRequests(options: ListPaymentRequestsInput): Promise<PaymentRequest[]> {
  const store = getPaymentRequestStore();
  return store.values();
}
