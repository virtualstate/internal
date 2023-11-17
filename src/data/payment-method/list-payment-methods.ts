import {PaymentMethod, PaymentMethodOwnerIdentifiers} from "./types";
import { getPaymentMethodStore } from "./store";

export interface ListPaymentMethodsInput extends PaymentMethodOwnerIdentifiers {

}

export async function listPaymentMethods(options: ListPaymentMethodsInput): Promise<PaymentMethod[]> {
  const store = getPaymentMethodStore(options);
  return store.values();
}
