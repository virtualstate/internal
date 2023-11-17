import { v4 } from "uuid";
import { PaymentMethodData, PaymentMethod } from "./types";
import { setPaymentMethod } from "./set-payment-method";

export async function addPaymentMethod(data: PaymentMethodData): Promise<PaymentMethod> {
  const paymentMethodId = v4();
  return setPaymentMethod({
    ...data,
    paymentMethodId,
  });
}
