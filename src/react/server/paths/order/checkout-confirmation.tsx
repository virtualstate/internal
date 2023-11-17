import {OrderCheckoutReviewComponentInfo, handler as baseHandler, CheckoutItems} from "./checkout-review";
import {useInput} from "../../data";
import {CheckoutEmpty} from "../../../client/components/checkout";
import {addPaymentMethod, listPaymentMethods, PaymentMethod, setOrder, ShipmentLocation} from "../../../../data";
import {FastifyReply, FastifyRequest} from "fastify";
import {getMaybePartner, getMaybeUser, getUser} from "../../../../authentication";
import {getOrderPrice} from "../../../../data/order-item/get-order-item-info";
import {InputConfig, PaymentForm} from "./types";
import {getConfig} from "../../../../config";
import {ReactNode, useMemo} from "react";
import exp from "constants";
import {getWebAuthnAuthenticationOptions, WebAuthnAuthenticationResponse} from "../../../../listen/auth/webauthn";
export const path = "/order/checkout/confirmation";

const {
    IS_DEMO
} = process.env;

export interface OrderCheckoutConfirmationComponentInfo extends OrderCheckoutReviewComponentInfo {
    paymentMethods: PaymentMethod[];
    paymentMethodForm?: PaymentForm;
    credentials?: WebAuthnAuthenticationResponse
}

export async function handler(): Promise<OrderCheckoutConfirmationComponentInfo> {
    const base: OrderCheckoutReviewComponentInfo = await baseHandler();

    const {
        total,
        currencyCode
    } = base;

    const paymentMethods = await listPaymentMethods({
        userId: getUser().userId
    });

    const details: PaymentDetailsInit = {
        total: {
            label: "Total",
            amount: {
                currency: currencyCode,
                value: total
            },
        }
    }

    const credentials = await getWebAuthnAuthenticationOptions({
        authenticatorType: "payment",
        payment: {
            details
        }
    });

    const info: OrderCheckoutConfirmationComponentInfo = {
        ...base,
        paymentMethods
    }
    // const exampleDefaultData = new FormData();
    // exampleDefaultData.set("example", "test")
    // const exampleDefaultForm: PaymentForm = {
    //     url: "/some-example",
    //     method: "GET",
    //     data: exampleDefaultData,
    //     inputs: {
    //         savePaymentMethod: true
    //     }
    // };
    const paymentMethodFormReturned = await getConfig().getPaymentForm?.(info); // ?? exampleDefaultForm;
    const paymentMethodForm =
        typeof paymentMethodFormReturned === "string" ?
            { url: paymentMethodFormReturned } :
            paymentMethodFormReturned;

    return {
        ...info,
        paymentMethods,
        paymentMethodForm,
        credentials
    }
}

interface Body extends Record<string, string> {
    type: "existingPaymentMethod" | "newPaymentMethod";
    paymentMethodId?: string;
    paymentMethodName?: string;
    savePaymentMethod?: string;
}

type Schema = {
    Body: Body
}

export async function submit(request: FastifyRequest<Schema>, response: FastifyReply, info: OrderCheckoutConfirmationComponentInfo) {

    const { order, paymentMethodForm } = info;

    const total = await getOrderPrice(order.orderId);

    console.log("Submitting order", order.orderId);

    await setOrder({
        ...order,
        status: "submitted"
    });

    const inputsEnabled = paymentMethodForm?.method !== "GET"
    const savePaymentMethod = getInputConfig(paymentMethodForm?.inputs, "savePaymentMethod", inputsEnabled);
    const paymentMethodName = getInputConfig(paymentMethodForm?.inputs, "paymentMethodName", inputsEnabled);

    console.log(request.body, savePaymentMethod, paymentMethodName);

    if (savePaymentMethod.enabled && paymentMethodName.enabled) {
        const isSaveInput = request.body[savePaymentMethod.name];
        let isSave = false;
        if (typeof isSaveInput === "string") {
            isSave = isSaveInput === "on" || isSaveInput === "1" || isSaveInput === "true";
        }
        const name = request.body[paymentMethodName.name];
        console.log({ isSaveInput, isSave, name });
        if (isSave && name) {
            await addPaymentMethod({
                status: "available",
                type: "realtime",
                userId: getMaybeUser()?.userId,
                organisationId: getMaybePartner()?.organisationId,
                paymentMethodName: name,
            });
        }
    }

    response.header("Location", `/order/checkout/confirmed/${order.orderId}`);
    response.status(302);
    response.send();
}

function getInputConfig(inputs: undefined | Record<string, boolean | InputConfig>, name: string, enabled?: boolean): InputConfig {
    if (!enabled) {
        return {
            enabled: false,
            name
        }
    }
    const found = inputs?.[name];
    if (typeof found === "boolean" || !found) {
        return {
            enabled: !!(found ?? true),
            name
        }
    }
    return {
        ...found,
        enabled: found.enabled !== false
    }
}

export function Component() {
    const {
        order,
        total,
        paymentMethods,
        paymentMethodForm,
        currencySymbol,
        credentials
    } = useInput<OrderCheckoutConfirmationComponentInfo>();

    const newPaymentMethodFormData = useMemo(() => {
        if (!paymentMethodForm?.data) return undefined;

        let data: ReactNode[] = [];

        paymentMethodForm.data.forEach(
            (value, name) => {
                data.push(
                    <input type="hidden" value={String(value)} name={name} />
                )
            }
        )

        if (!data.length) return undefined;
        return (
            <>{data}</>
        )
    }, [paymentMethodForm?.data])

    if (!order.products.length) {
        return <CheckoutEmpty />
    }

    const inputsEnabled = paymentMethodForm?.method !== "GET"
    const nameOnCard = getInputConfig(paymentMethodForm?.inputs, "nameOnCard", inputsEnabled);
    const cardNumber = getInputConfig(paymentMethodForm?.inputs, "cardNumber", inputsEnabled);
    const expirationMonth = getInputConfig(paymentMethodForm?.inputs, "expirationMonth", inputsEnabled);
    const expirationYear = getInputConfig(paymentMethodForm?.inputs, "expirationYear", inputsEnabled);
    const cvc = getInputConfig(paymentMethodForm?.inputs, "cvc", inputsEnabled);
    const savePaymentMethod = getInputConfig(paymentMethodForm?.inputs, "savePaymentMethod", inputsEnabled);
    const paymentMethodName = getInputConfig(paymentMethodForm?.inputs, "paymentMethodName", inputsEnabled);

    return (
        <div id="checkout-confirmation" className="lg:flex lg:min-h-full flex flex-col">
            <h1 className="sr-only">Checkout</h1>
            <style dangerouslySetInnerHTML={{ __html: `
            
            #checkout-confirmation details:not([open]) .inline-on-open {
                display: none;
            }
            #checkout-confirmation details:not([open]) .hidden-on-open {
                display: inline;
            }
            #checkout-confirmation details[open] .inline-on-open {
                display: inline;
            }
            #checkout-confirmation details[open] .hidden-on-open {
                display: none;
            }
            `.trim()}} />
            <section aria-labelledby="order-heading" className="py-6 w-full">
                <details className="w-full">
                    <summary className="flex items-center justify-between">
                        <h2 id="order-heading" className="text-lg font-medium text-gray-900">
                            Your Order
                        </h2>
                        <span className="font-medium text-indigo-600 hover:text-indigo-500 cursor-pointer select-none">
                            <span className="inline-on-open">Hide full summary</span>
                            <span className="hidden-on-open">Show full summary</span>
                        </span>
                    </summary>
                    <CheckoutItems className="divide-y divide-gray-200 border-gray-200" />
                </details>
                {total ? (
                    <p className="mt-6 flex items-center justify-between border-t border-gray-200 pt-6 text-sm font-medium text-gray-900">
                        <span className="text-base">Total</span>
                        <span className="text-base">{currencySymbol}{total}</span>
                    </p>
                ) : undefined}
            </section>
            {
                paymentMethods.length ? (
                    <form action={path} method="POST" id="payment-method-confirmation">
                        {
                            credentials ? (
                                <>
                                    <script type="application/json" className="payment-method-credentials" dangerouslySetInnerHTML={{ __html: JSON.stringify(credentials) }} />
                                    <input type="hidden" value="" name="userCredentialId" />
                                    <input type="hidden" value="" name="userCredentialState" />
                                </>
                            ) : undefined
                        }
                        <input type="hidden" name="type" value="existingPaymentMethod" />
                        <div className="px-4 pb-36 pt-16 sm:px-6 lg:col-start-1 lg:row-start-1 lg:px-0 lg:pb-16">
                            <div className="col-span-3 sm:col-span-4">
                                <label htmlFor="paymentMethodId" className="block text-sm font-medium text-gray-700">
                                    Payment Method
                                </label>
                                <div className="mt-1">
                                    <select
                                        defaultValue={order.paymentMethodId}
                                        id="paymentMethodId"
                                        name="paymentMethodId"
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    >
                                        {paymentMethods.map(
                                            paymentMethod => (
                                                <option
                                                    key={paymentMethod.paymentMethodId}
                                                    value={paymentMethod.paymentMethodId}
                                                >
                                                    {paymentMethod.paymentMethodName}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-10 border-gray-200 pt-6 flex justify-end">
                                <button
                                    type="submit"
                                    className="w-full rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50 sm:order-last sm:ml-6 sm:w-auto"
                                >
                                    Confirm Order
                                </button>
                            </div>
                        </div>
                    </form>
                ) : undefined
            }

            {
                paymentMethods.length === 0 ?
            <form action={paymentMethodForm?.url ?? path} encType={paymentMethodForm?.encoding} method={paymentMethodForm?.method ?? "POST"} id="checkout-confirmation-new-payment-method" className="checkout-payment-method px-4 pb-36 pt-16 sm:px-6 lg:col-start-1 lg:row-start-1 lg:px-0 lg:pb-16">
                {
                    credentials ? (
                        <>
                            <script type="application/json" className="payment-method-credentials" dangerouslySetInnerHTML={{ __html: JSON.stringify(credentials) }} />
                            <input type="hidden" value="" name="userCredentialId" />
                            <input type="hidden" value="" name="userCredentialState" />
                        </>
                    ) : undefined
                }
                {newPaymentMethodFormData}
                {paymentMethodForm?.header}
                {
                    !paymentMethodForm?.url ? (
                        <>
                            <input type="hidden" name="type" value="newPaymentMethod" />
                        </>
                    ) : undefined
                }
                <div className="mx-auto max-w-lg lg:max-w-none">

                    <section aria-labelledby="payment-heading" className="mt-10">
                        <h2 id="payment-heading" className="text-lg font-medium text-gray-900">
                            Payment details
                        </h2>

                        <div className="mt-6 grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4">
                            {
                                nameOnCard.enabled ? (
                                    <div className="col-span-3 sm:col-span-4">
                                        <label htmlFor={nameOnCard.name} className="block text-sm font-medium text-gray-700">
                                            Name on card
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                maxLength={64}
                                                type="text"
                                                id={nameOnCard.name}
                                                name={nameOnCard.name}
                                                disabled={!!IS_DEMO}
                                                defaultValue={IS_DEMO ? "Kristin Watson" : ""}
                                                autoComplete="cc-name"
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                {...nameOnCard.props}
                                            />
                                        </div>
                                    </div>
                                ) : undefined
                            }

                            {
                                cardNumber.enabled ? (
                                    <div className="col-span-3 sm:col-span-4">
                                        <label htmlFor={cardNumber.name} className="block text-sm font-medium text-gray-700">
                                            Card number
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                minLength={14}
                                                maxLength={20}
                                                type="text"
                                                id={cardNumber.name}
                                                name={cardNumber.name}
                                                disabled={!!IS_DEMO}
                                                defaultValue={IS_DEMO ? "5246 5910 8900 4242" : ""}
                                                autoComplete="cc-number"
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                {...cardNumber.props}
                                            />
                                        </div>
                                    </div>
                                ) : undefined
                            }

                            {
                                expirationMonth.enabled ? (
                                    <div>
                                        <label htmlFor={expirationMonth.name} className="block text-sm font-medium text-gray-700">
                                            Expiration Month
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                minLength={2}
                                                maxLength={2}
                                                type="text"
                                                name={expirationMonth.name}
                                                id={expirationMonth.name}
                                                disabled={!!IS_DEMO}
                                                defaultValue={IS_DEMO ? "12" : ""}
                                                autoComplete="cc-exp-month"
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                {...expirationMonth.props}
                                            />
                                        </div>
                                    </div>
                                ) : undefined
                            }

                            {
                                expirationYear.enabled ? (
                                    <div>
                                        <label htmlFor={expirationYear.name} className="block text-sm font-medium text-gray-700">
                                            Expiration Year
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                minLength={2}
                                                maxLength={2}
                                                type="text"
                                                name={expirationYear.name}
                                                id={expirationYear.name}
                                                disabled={!!IS_DEMO}
                                                defaultValue={IS_DEMO ? (new Date().getFullYear() + 1).toString() : ""}
                                                autoComplete="cc-exp-year"
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                {...expirationYear.props}
                                            />
                                        </div>
                                    </div>
                                ) : undefined
                            }

                            {
                                cvc.enabled ? (
                                    <div className="col-span-2">
                                        <label htmlFor={cvc.name} className="block text-sm font-medium text-gray-700">
                                            CVC
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                type="text"
                                                name={cvc.name}
                                                id={cvc.name}
                                                minLength={3}
                                                maxLength={4}
                                                autoComplete="cc-csc"
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                disabled={!!IS_DEMO}
                                                defaultValue={IS_DEMO ? "729" : ""}
                                                {...cvc.props}
                                            />
                                        </div>
                                    </div>
                                ) : undefined
                            }

                            {
                                savePaymentMethod.enabled && paymentMethodName.enabled ? (
                                    <>
                                        <div className="flex items-center col-span-3">
                                            <input
                                                id={savePaymentMethod.name}
                                                name={savePaymentMethod.name}
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <div className="ml-2">
                                                <label htmlFor={savePaymentMethod.name} className="text-sm font-medium text-gray-900">
                                                    Save Payment Method
                                                </label>
                                            </div>
                                        </div>

                                        <style dangerouslySetInnerHTML={{__html: `
                        
                        .checkout-payment-method:has(input#${savePaymentMethod.name}:checked) .block-if-save {
                            display: block;
                        }
                        .checkout-payment-method:has(input#${savePaymentMethod.name}:not(:checked)) .block-if-save {
                            display: none;
                        }
                        
                        `.trim()}} />

                                        <div className="col-span-3 sm:col-span-4 block-if-save">
                                            <label htmlFor={paymentMethodName.name} className="block text-sm font-medium text-gray-700">
                                                Payment Method Name
                                            </label>
                                            <div className="mt-1">
                                                <input
                                                    type="text"
                                                    id={paymentMethodName.name}
                                                    name={paymentMethodName.name}
                                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                />
                                            </div>
                                        </div>
                                    </>
                                ) : undefined
                            }


                            {
                                !credentials.authentication?.required ? (
                                    <div className="flex items-center col-span-3">
                                        <input
                                            id="paymentAuthenticator"
                                            name="paymentAuthenticator"
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div className="ml-2">
                                            <label htmlFor="paymentAuthenticator" className="text-sm font-medium text-gray-900">
                                                Register Keypass for Payments
                                            </label>
                                        </div>
                                    </div>
                                ) : undefined
                            }
                        </div>
                    </section>

                    {
                        paymentMethodForm?.submit ?? (
                            <div className="mt-10 border-t border-gray-200 pt-6 flex justify-end">
                                <input
                                    value={paymentMethodForm?.method === "GET" ? "Continue to payment" : "Submit"}
                                    type="submit"
                                    className="w-full rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50 sm:order-last sm:ml-6 sm:w-auto"
                                />
                            </div>
                        )
                    }
                    {paymentMethodForm?.footer}
                </div>
            </form>
            : undefined }

        </div>
    )
}