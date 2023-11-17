import { Payment } from "./types";
import { getPaymentStore } from "./store";
import {PaymentMethodOwnerIdentifiers} from "../payment-method";

export interface ListPaymentsInput extends PaymentMethodOwnerIdentifiers {

}

export async function listPayments(input: ListPaymentsInput): Promise<Payment[]> {
  const store = getPaymentStore(input);
  return store.values();
}
