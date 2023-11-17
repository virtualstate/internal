import {useData, usePaymentMethods} from "../../data";
import {getMaybePartner, getMaybeUser} from "../../../../authentication";
import {listPaymentMethods} from "../../../../data";
import {getUserIdentifiers} from "./utils";

export const path = "/payment-methods";

export async function handler() {
    return {
        paymentMethods: await listPaymentMethods(getUserIdentifiers())
    }
}

const LINK_CLASS = "text-blue-600 hover:bg-white underline hover:underline-offset-2";

export function ListPaymentMethods() {
    const paymentMethods = usePaymentMethods();
    const { isUnauthenticated, url } = useData();
    const { pathname } = new URL(url);
    return (
        <div className="flex flex-col">
            <a href="/payment-method/create" className={LINK_CLASS}>Create Payment Method</a>
            <div className="flex flex-col divide-y">
                {paymentMethods.map(paymentMethod => (
                    <div key={paymentMethod.paymentMethodId} className="flex flex-row justify-between">
                        <div>{paymentMethod.paymentMethodName}</div>
                        <div>
                            <a href={`/api/version/1/payments/methods/${paymentMethod.paymentMethodId}/delete?redirect=${pathname}`} className={LINK_CLASS}>
                                Delete
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export const Component = ListPaymentMethods;