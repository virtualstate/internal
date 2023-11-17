import { getPaymentRequestStore } from "./store";
import { PaymentRequestIdentifier } from "./types";

export function getPaymentRequest(options: PaymentRequestIdentifier) {
  const store = getPaymentRequestStore();
  return store.get(options.paymentRequestId);
}
