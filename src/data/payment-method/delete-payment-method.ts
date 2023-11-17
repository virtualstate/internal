import {PaymentMethodIdentifier} from "./types";
import {getPaymentMethodStore} from "./store";

export async function deletePaymentMethod(options: PaymentMethodIdentifier) {
    const store = getPaymentMethodStore(options);
    return store.delete(options.paymentMethodId);
}