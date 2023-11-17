import { v4 } from "uuid";
import { PaymentRequestData, PaymentRequest } from "./types";
import { setPaymentRequest } from "./set-payment-request";

export async function addPaymentRequest(data: PaymentRequestData): Promise<PaymentRequest> {
  const paymentRequestId = v4();
  return setPaymentRequest({
    ...data,
    paymentRequestId,
  });
}
