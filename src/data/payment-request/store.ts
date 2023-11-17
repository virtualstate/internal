import { getKeyValueStore } from "../kv";
import { PaymentRequest } from "./types";

const STORE_NAME = "paymentRequest" as const;

export function getPaymentRequestStore() {
  return getKeyValueStore<PaymentRequest>(STORE_NAME, {
    counter: true
  });
}