import { getPaymentMethodStore } from "./store";
import { PaymentMethodIdentifier } from "./types";

export function getPaymentMethod(options: PaymentMethodIdentifier) {
  const store = getPaymentMethodStore(options);
  return store.get(options.paymentMethodId);
}
