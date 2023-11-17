import { getKeyValueStore } from "../kv";
import { Payment } from "./types";
import { PaymentMethodOwnerIdentifiers } from "../payment-method";

const STORE_NAME = "payment" as const;

export function getUserPaymentStore(userId: string) {
  return getKeyValueStore<Payment>(STORE_NAME, {
    counter: true,
    prefix: `userId::${userId}`
  });
}

export function getOrganisationPaymentStore(organisationId: string) {
  return getKeyValueStore<Payment>(STORE_NAME, {
    counter: true,
    prefix: `organisationId::${organisationId}`
  });
}

export function getPaymentStore(data: PaymentMethodOwnerIdentifiers) {
  if (data.organisationId) {
    return getOrganisationPaymentStore(data.organisationId);
  }
  if (data.userId) {
    return getUserPaymentStore(data.userId);
  }
  throw new Error("Expected organisationId or userId for payment");
}