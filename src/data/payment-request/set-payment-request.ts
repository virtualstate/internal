import {PaymentRequest, PaymentRequestData, PaymentRequestType} from "./types";
import { getPaymentRequestStore } from "./store";
import { v4 } from "uuid";

const DEFAULT_PAYMENT_REQUEST_TYPES: PaymentRequestType[] = [
    "invoice",
    "realtime"
];

export async function setPaymentRequest(
  data: PaymentRequestData & Partial<PaymentRequest>
): Promise<PaymentRequest> {
  const store = await getPaymentRequestStore();
  const updatedAt = new Date().toISOString();
  const paymentRequestId = data.paymentRequestId || v4()
  const document: PaymentRequest = {
    createdAt: data.createdAt || updatedAt,
    ...data,
    status: data.status ?? "pending",
    types: data.types ?? DEFAULT_PAYMENT_REQUEST_TYPES,
    paymentRequestId,
    updatedAt,
  };
  await store.set(data.paymentRequestId, document);
  return document;
}