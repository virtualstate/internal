import {ProductListComponentInfo, handler as baseHandler} from "../product/list";
import {useData, useInput, useProducts, useService, useServices} from "../../data";
import {TrashIcon} from "../../../client/components/icons";
import {getOrderPrice} from "../../../../data/order-item/get-order-item-info";
import {CheckoutEmpty} from "../../../client/components/checkout";
import {OfferPrice} from "../../../../data";

export const path = "/order/checkout/review";

export interface OrderCheckoutReviewComponentInfo extends ProductListComponentInfo, OfferPrice {
    total: string
}

export async function handler(): Promise<OrderCheckoutReviewComponentInfo> {
    const base: ProductListComponentInfo = await baseHandler();
    const price = await getOrderPrice(base.order.orderId, base.order.items);

    return {
        ...base,
        ...price,
        // Be explicit that the price is the total price
        total: price.price
    }
}

export interface CheckoutItemsProps {
    className?: string; // Replaces class name, not adds
    remove?: boolean
}

export function CheckoutItems({ className, remove = true }: CheckoutItemsProps) {
    const {
        order,
        order: { orderId },
        offers,
        images600,
        currencySymbol
    } = useInput<OrderCheckoutReviewComponentInfo>();
    const products = useProducts();
    const services = useServices();
    const { url } = useData();
    const { pathname } = new URL(url);

    return (
        <ul role="list" className={className || "divide-y divide-gray-200 border-b border-t border-gray-200"}>
            {order.products.map((item) => {

                const offer = item.offerId ? offers.find(offer => offer.offerId === item.offerId) : undefined;
                const product = products.find(product => product.productId === item.productId);
                const images = images600.filter(file => file.productId === product.productId);

                const total = offer ?
                    (Math.round((+offer.price) * (item.quantity ?? 1) * 100) / 100).toFixed(2) :
                    undefined;

                return (
                    <li key={item.orderItemId} className="flex py-6">
                        <div className="flex-shrink-0">
                            {
                                images.map(
                                    (image, index, array) => (
                                        <img
                                            data-index={index}
                                            data-length={array.length}
                                            loading={index === 0 ? "eager" : "lazy"}
                                            hidden={index !== 0}
                                            key={index}
                                            src={image.url}
                                            alt={String(image.description || product.productName)}
                                            className="h-24 w-24 rounded-md object-cover object-center sm:h-32 sm:w-32"
                                        />
                                    )
                                )
                            }
                        </div>

                        <div className="ml-4 flex flex-1 flex-col sm:ml-6">
                            <div>
                                <div className="flex justify-between">
                                    <h4 className="text-sm">
                                        <a href="/products" className="font-medium text-gray-700 hover:text-gray-800">
                                            {product.productName}
                                        </a>
                                    </h4>
                                    <p className="ml-4 text-sm font-medium text-gray-900">{offer ? `${currencySymbol}${total}` : ""}</p>
                                </div>
                                {/*<p className="mt-1 text-sm text-gray-500">{product.color}</p>*/}
                                {/*<p className="mt-1 text-sm text-gray-500">{product.size}</p>*/}
                            </div>

                            <div className="mt-4 flex flex-1 items-end justify-between">
                                <div className="flex items-center space-x-2 text-sm text-gray-700">
                                    {/*{product.inStock ? (*/}
                                    {/*    <CheckIcon className="h-5 w-5 flex-shrink-0 text-green-500" aria-hidden="true" />*/}
                                    {/*) : (*/}
                                    {/*    <ClockIcon className="h-5 w-5 flex-shrink-0 text-gray-300" aria-hidden="true" />*/}
                                    {/*)}*/}

                                    {/*<span>{product.inStock ? 'In stock' : `Will ship in ${product.leadTime}`}</span>*/}
                                </div>
                                {
                                    remove ? (
                                        <div className="ml-4">
                                            <a
                                                href={`/api/version/1/orders/${orderId}/items/${offer ? "offers" : "products"}/${offer ? offer.offerId : product.productId}/delete?redirect=${pathname}`}
                                                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex flex-row"
                                                title={`Remove ${item.quantity} ${product.productName} from bag`}
                                            >
                                                <TrashIcon className="w-5 h-5" />&nbsp;
                                                Remove {item.quantity} from bag
                                            </a>
                                        </div>
                                    ) : undefined
                                }
                            </div>
                        </div>
                    </li>
                )
            })}

            {order.services.map((item) => {

                const offer = item.offerId ? offers.find(offer => offer.offerId === item.offerId) : undefined;
                const service = services.find(service => service.serviceId === item.serviceId);
                const images = images600.filter(file => file.serviceId === service.serviceId);

                const total = offer ?
                    (Math.round((+offer.price) * (item.quantity ?? 1) * 100) / 100).toFixed(2) :
                    undefined;

                return (
                    <li key={item.orderItemId} className="flex py-6">
                        <div className="flex-shrink-0">
                            {
                                images.map(
                                    (image, index, array) => (
                                        <img
                                            data-index={index}
                                            data-length={array.length}
                                            loading={index === 0 ? "eager" : "lazy"}
                                            hidden={index !== 0}
                                            key={index}
                                            src={image.url}
                                            alt={String(image.description || service.serviceName)}
                                            className="h-24 w-24 rounded-md object-cover object-center sm:h-32 sm:w-32"
                                        />
                                    )
                                )
                            }
                        </div>

                        <div className="ml-4 flex flex-1 flex-col sm:ml-6">
                            <div>
                                <div className="flex justify-between">
                                    <h4 className="text-sm">
                                        <a href="/services" className="font-medium text-gray-700 hover:text-gray-800">
                                            {service.serviceName}
                                        </a>
                                    </h4>
                                    <p className="ml-4 text-sm font-medium text-gray-900">{offer ? `${currencySymbol}${total}` : ""}</p>
                                </div>
                                {/*<p className="mt-1 text-sm text-gray-500">{service.color}</p>*/}
                                {/*<p className="mt-1 text-sm text-gray-500">{service.size}</p>*/}
                            </div>

                            <div className="mt-4 flex flex-1 items-end justify-between">
                                <div className="flex items-center space-x-2 text-sm text-gray-700">
                                    {/*{service.inStock ? (*/}
                                    {/*    <CheckIcon className="h-5 w-5 flex-shrink-0 text-green-500" aria-hidden="true" />*/}
                                    {/*) : (*/}
                                    {/*    <ClockIcon className="h-5 w-5 flex-shrink-0 text-gray-300" aria-hidden="true" />*/}
                                    {/*)}*/}

                                    {/*<span>{service.inStock ? 'In stock' : `Will ship in ${service.leadTime}`}</span>*/}
                                </div>
                                {
                                    remove ? (
                                        <div className="ml-4">
                                            <a
                                                href={`/api/version/1/orders/${orderId}/items/${offer ? "offers" : "services"}/${offer ? offer.offerId : service.serviceId}/delete?redirect=${pathname}`}
                                                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex flex-row"
                                                title={`Remove ${item.quantity} ${service.serviceName} from bag`}
                                            >
                                                <TrashIcon className="w-5 h-5" />&nbsp;
                                                Remove {item.quantity} from bag
                                            </a>
                                        </div>
                                    ) : undefined
                                }
                            </div>
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}


export function Component() {
    const {
        order,
        total,
        currencySymbol
    } = useInput<OrderCheckoutReviewComponentInfo>();

    if (!order.products.length) {
        return <CheckoutEmpty />
    }

    return (
        <div className="bg-white">
            <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:px-0">
                <h1 className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Shopping Cart</h1>

                <div className="mt-12">
                    <section aria-labelledby="cart-heading">
                        <h2 id="cart-heading" className="sr-only">
                            Items in your shopping cart
                        </h2>

                        <CheckoutItems />
                    </section>

                    {/* Order summary */}
                    <section aria-labelledby="summary-heading" className="mt-10">
                        <h2 id="summary-heading" className="sr-only">
                            Order summary
                        </h2>

                        {total ? (
                            <div>
                                <dl className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <dt className="text-base font-medium text-gray-900">Subtotal</dt>
                                        <dd className="ml-4 text-base font-medium text-gray-900">{currencySymbol}{total}</dd>
                                    </div>
                                </dl>
                                <p className="mt-1 text-sm text-gray-500">Shipping and taxes will be calculated at checkout.</p>
                            </div>
                        ) : undefined}

                        <div className="mt-10 w-full">
                            <a
                                href="/order/checkout"
                                className="flex items-center justify-center w-full rounded-md border border-transparent bg-indigo-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
                            >
                                Checkout
                            </a>
                        </div>

                        <div className="mt-6 text-center text-sm">
                            <p>
                                or&nbsp;
                                <a href="/products" className="font-medium text-indigo-600 hover:text-indigo-500">
                                    Continue Shopping
                                    <span aria-hidden="true"> &rarr;</span>
                                </a>
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}