import { v4 } from "uuid";
import { PaymentData, Payment } from "./types";
import { setPayment } from "./set-payment";

export async function addPayment(data: PaymentData): Promise<Payment> {
  const paymentId = v4();
  return setPayment({
    ...data,
    paymentId,
  });
}
