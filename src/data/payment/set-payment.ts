import { Payment, PaymentData } from "./types";
import { getPaymentStore } from "./store";

export async function setPayment(
  data: PaymentData & Pick<Payment, "paymentId"> & Partial<Payment>
): Promise<Payment> {
  const store = await getPaymentStore(data);
  const updatedAt = new Date().toISOString();
  const document: Payment = {
    createdAt: data.createdAt || updatedAt,
    ...data,
    updatedAt,
  };
  await store.set(data.paymentId, document);
  return document;
}