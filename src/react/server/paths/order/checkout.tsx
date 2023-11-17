import {OrderCheckoutReviewComponentInfo, handler as baseHandler, CheckoutItems} from "./checkout-review";
import {useInput} from "../../data";
import {CheckoutEmpty} from "../../../client/components/checkout";
import {setOrder, ShipmentLocation} from "../../../../data";
import {FastifyReply, FastifyRequest} from "fastify";
export const path = "/order/checkout";

export const {
    ORDER_CHECKOUT_DISABLE_NAME,
    ORDER_CHECKOUT_DISABLE_COMPANY
} = process.env;

export interface OrderCheckoutComponentInfo extends OrderCheckoutReviewComponentInfo {

}

export async function handler() {
    const base = await baseHandler();

    return {
        ...base
    }
}

type Body = {
    to: ShipmentLocation;
    paymentMethod: {
        to: ShipmentLocation;
    }
}

type Schema = {
    Body: Body
}

export async function submit(request: FastifyRequest<Schema>, response: FastifyReply, info: OrderCheckoutComponentInfo) {

    const { order } = info;

    const updated = await setOrder({
        ...order,
        to: {
            ...order.to,
            ...request.body.to,
            userId: order.to.userId,
            organisationId: order.to.organisationId
        },
        paymentMethod: {
            ...order.paymentMethod,
            to: request.body.paymentMethod.to
        }
    });

    console.log(updated);

    response.header("Location", "/order/checkout/confirmation");
    response.status(302);
    response.send();
}

export function Component() {
    const {
        order,
        total,
        currencySymbol
    } = useInput<OrderCheckoutComponentInfo>();

    console.log(order);

    if (!order.products.length) {
        return <CheckoutEmpty />
    }

    return (
        <form action={path} method="POST" id="checkout" className="lg:flex lg:min-h-full flex flex-col">
            <h1 className="sr-only">Checkout</h1>
            <style dangerouslySetInnerHTML={{ __html: `
            
            #checkout details:not([open]) .inline-on-open {
                display: none;
            }
            #checkout details:not([open]) .hidden-on-open {
                display: inline;
            }
            #checkout details[open] .inline-on-open {
                display: inline;
            }
            #checkout details[open] .hidden-on-open {
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

            <div className="px-4 pb-36 pt-16 sm:px-6 lg:col-start-1 lg:row-start-1 lg:px-0 lg:pb-16">
                <div className="mx-auto max-w-lg lg:max-w-none">
                    <section aria-labelledby="contact-info-heading">
                        <h2 id="contact-info-heading" className="text-lg font-medium text-gray-900">
                            Contact information
                        </h2>

                        <div className="mt-6">
                            <label htmlFor="email-address" className="block text-sm font-medium text-gray-700">
                                Email address
                            </label>
                            <div className="mt-1">
                                <input
                                    type="email"
                                    id="email-address"
                                    name="to.email"
                                    autoComplete="email"
                                    defaultValue={order.to?.email}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                />
                            </div>
                        </div>
                    </section>

                    <section aria-labelledby="shipping-heading" className="mt-10">
                        <h2 id="shipping-heading" className="text-lg font-medium text-gray-900">
                            Shipping address
                        </h2>

                        <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">

                            {
                                !ORDER_CHECKOUT_DISABLE_COMPANY ? (
                                    <div className="sm:col-span-3">
                                        <label htmlFor="shippingCompany" className="block text-sm font-medium text-gray-700">
                                            Company
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                type="text"
                                                id="shippingCompany"
                                                name="to.organisationText"
                                                defaultValue={order.to?.organisationText}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            />
                                        </div>
                                    </div>
                                ) : undefined
                            }

                            {
                                !ORDER_CHECKOUT_DISABLE_NAME ? (
                                    <div className="sm:col-span-3">
                                        <label htmlFor="shippingName" className="block text-sm font-medium text-gray-700">
                                            Name
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                type="text"
                                                id="shippingName"
                                                name="to.name"
                                                autoComplete="name"
                                                defaultValue={order.to?.name}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            />
                                        </div>
                                    </div>
                                ) : undefined
                            }

                            <div className="sm:col-span-3">
                                <label htmlFor="shippingAddress" className="block text-sm font-medium text-gray-700">
                                    Address
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        id="shippingAddress"
                                        name="to.address[0]"
                                        autoComplete="street-address"
                                        defaultValue={order.to?.address?.[0]}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="shippingCity" className="block text-sm font-medium text-gray-700">
                                    City
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        id="shippingCity"
                                        name="to.address[1]"
                                        autoComplete="address-level2"
                                        defaultValue={order.to?.address?.[1]}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="shippingRegion" className="block text-sm font-medium text-gray-700">
                                    State / Province
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        id="shippingRegion"
                                        name="to.address[2]"
                                        autoComplete="address-level1"
                                        defaultValue={order.to?.address?.[2]}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="shippingPostCode" className="block text-sm font-medium text-gray-700">
                                    Postal code
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        id="shippingPostCode"
                                        name="to.address[3]"
                                        autoComplete="postal-code"
                                        defaultValue={order.to?.address?.[3]}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center col-span-3">
                                <input
                                    id="save-as-user-default"
                                    name="to.saveAsUserDefault"
                                    type="checkbox"
                                    defaultChecked={order.to?.saveAsUserDefault ?? false}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div className="ml-2">
                                    <label htmlFor="save-as-user-default" className="text-sm font-medium text-gray-900">
                                        Save as default shipping information
                                    </label>
                                </div>
                            </div>
                        </div>

                    </section>

                    <section aria-labelledby="billing-heading" className="mt-10 checkout-billing-address">
                        <h2 id="billing-heading" className="text-lg font-medium text-gray-900">
                            Billing information
                        </h2>

                        <div className="mt-6 flex items-center">
                            <input
                                id="same-as-shipping"
                                name="paymentMethod.to.sameAsShipping"
                                type="checkbox"
                                defaultChecked={order.paymentMethod?.to?.sameAsShipping ?? true}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="ml-2">
                                <label htmlFor="same-as-shipping" className="text-sm font-medium text-gray-900">
                                    Same as shipping information
                                </label>
                            </div>
                        </div>

                        <style dangerouslySetInnerHTML={{__html: `
                        
                        .checkout-billing-address:has(input#same-as-shipping:checked) .hidden-if-same-as-shipping {
                            display: none;
                        }
                        
                        `.trim()}} />

                        <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3 hidden-if-same-as-shipping">

                            <div className="sm:col-span-3">
                                <label htmlFor="billingEmail"
                                       className="block text-sm font-medium text-gray-700">
                                    Company
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        id="billingEmail"
                                        autoComplete="email"
                                        name="paymentMethod.to.email"
                                        defaultValue={order.paymentMethod?.to?.email}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                            </div>

                            {
                                !ORDER_CHECKOUT_DISABLE_COMPANY ? (
                                    <div className="sm:col-span-3">
                                        <label htmlFor="billingCompany"
                                               className="block text-sm font-medium text-gray-700">
                                            Company
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                type="text"
                                                id="billingCompany"
                                                name="paymentMethod.to.organisationText"
                                                defaultValue={order.paymentMethod?.to?.organisationText}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            />
                                        </div>
                                    </div>
                                ) : undefined
                            }


                            {
                                !ORDER_CHECKOUT_DISABLE_NAME ? (
                                    <div className="sm:col-span-3">
                                        <label htmlFor="billingName" className="block text-sm font-medium text-gray-700">
                                            Name
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                type="text"
                                                id="billingName"
                                                name="paymentMethod.to.name"
                                                defaultValue={order.paymentMethod?.to?.name}
                                                autoComplete="name"
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            />
                                        </div>
                                    </div>
                                ) : undefined
                            }

                            <div className="sm:col-span-3">
                                <label htmlFor="billingAddress" className="block text-sm font-medium text-gray-700">
                                    Address
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        id="billingAddress"
                                        name="paymentMethod.to.address[0]"
                                        defaultValue={order.paymentMethod?.to?.address?.[0]}
                                        autoComplete="street-address"
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="billingCity" className="block text-sm font-medium text-gray-700">
                                    City
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        id="billingCity"
                                        name="paymentMethod.to.address[1]"
                                        defaultValue={order.paymentMethod?.to?.address?.[1]}
                                        autoComplete="address-level2"
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="billingRegion" className="block text-sm font-medium text-gray-700">
                                    State / Province
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        id="billingRegion"
                                        name="paymentMethod.to.address[2]"
                                        defaultValue={order.paymentMethod?.to?.address?.[2]}
                                        autoComplete="address-level1"
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="billingPostCode" className="block text-sm font-medium text-gray-700">
                                    Postal code
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        id="billingPostCode"
                                        name="paymentMethod.to.address[3]"
                                        defaultValue={order.paymentMethod?.to?.address?.[3]}
                                        autoComplete="postal-code"
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center col-span-3">
                                <input
                                    id="billing-save-as-user-default"
                                    name="paymentMethod.to.saveAsUserDefault"
                                    defaultChecked={order.paymentMethod?.to?.saveAsUserDefault}
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div className="ml-2">
                                    <label htmlFor="billing-save-as-user-default" className="text-sm font-medium text-gray-900">
                                        Save as default billing information
                                    </label>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="mt-10 border-t border-gray-200 pt-6 sm:flex sm:items-center sm:justify-between">
                        <button
                            type="submit"
                            className="w-full rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50 sm:order-last sm:ml-6 sm:w-auto"
                        >
                            Continue
                        </button>
                        <p className="mt-4 text-center text-sm text-gray-500 sm:mt-0 sm:text-left">
                            You won't be charged until the next step.
                        </p>
                    </div>
                </div>
            </div>
        </form>
    )
}