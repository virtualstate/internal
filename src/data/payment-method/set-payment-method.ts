import { PaymentMethod, PaymentMethodData } from "./types";
import { getPaymentMethodStore } from "./store";
import {v4} from "uuid";

export async function setPaymentMethod(
  data: PaymentMethodData & Partial<PaymentMethod>
): Promise<PaymentMethod> {
  const store = await getPaymentMethodStore(data);
  const updatedAt = new Date().toISOString();
  const paymentMethodId = data.paymentMethodId || v4()
  const document: PaymentMethod = {
    createdAt: data.createdAt || updatedAt,
    ...data,
    paymentMethodId,
    updatedAt,
  };
  await store.set(data.paymentMethodId, document);
  return document;
}