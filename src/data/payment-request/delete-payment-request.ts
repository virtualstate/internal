import {PaymentRequestIdentifier} from "./types";
import {getPaymentRequestStore} from "./store";

export async function deletePaymentRequest(options?: PaymentRequestIdentifier) {
    const store = getPaymentRequestStore();
    return store.delete(options.paymentRequestId);
}