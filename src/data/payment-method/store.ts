import { getKeyValueStore } from "../kv";
import {PaymentMethod, PaymentMethodOwnerIdentifiers} from "./types";

const STORE_NAME = "paymentMethod" as const;

export function getUserPaymentMethodStore(userId: string) {
  return getKeyValueStore<PaymentMethod>(STORE_NAME, {
    counter: true,
    prefix: `userId::${userId}`
  });
}

export function getOrganisationPaymentMethodStore(organisationId: string) {
  return getKeyValueStore<PaymentMethod>(STORE_NAME, {
    counter: true,
    prefix: `organisationId::${organisationId}`
  });
}

export function getPaymentMethodStore(data: PaymentMethodOwnerIdentifiers) {
  if (data.organisationId) {
    return getOrganisationPaymentMethodStore(data.organisationId);
  }
  if (data.userId) {
    return getUserPaymentMethodStore(data.userId);
  }
  throw new Error("Expected organisationId or userId for paymentMethod")
}