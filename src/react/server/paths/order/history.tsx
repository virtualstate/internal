import {useData, useInput, useOffer, useOrders, useProduct, useProducts, useQuery} from "../../data";
import {listOffers, listOrders, listProductFiles, Offer, Order, File, getOrderInfo} from "../../../../data";
import {getMaybePartner, getMaybeUser, isUnauthenticated} from "../../../../authentication";
import {useMemo} from "react";
import {ok} from "../../../../is";
import {CheckoutEmpty} from "../../../client/components/checkout";

export const path = "/orders/history";
export const anonymous = true;
export const cached = true;

const LINK_CLASS = "text-blue-600 hover:bg-white underline hover:underline-offset-2";

export interface OrderHistoryInfo {
    offers: Offer[];
    orders: Order[];
    productImages: Record<string, File>;
}

export async function handler(): Promise<OrderHistoryInfo> {
    const images600 = (
        await listProductFiles({
            public: isUnauthenticated(),
            size: 600,
        })
    ).filter(file => file.pinned);
    const productImages = Object.fromEntries(
        images600.map(
            image => {
                const { productId } = image;
                ok(typeof productId === "string");
                return [productId, image] as const;
            }
        )
    )
    const orders = await Promise.all(
        (
            await listOrders({
                location: {
                    userId: getMaybeUser()?.userId,
                    organisationId: getMaybePartner()?.organisationId
                }
            })
        )
            .map(getOrderInfo)
    );
    const offers = await listOffers({
        public: isUnauthenticated()
    })
    return {
        offers,
        orders,
        productImages
    }
}

export function OrderHistory() {
    const {
        orders: allOrders,
        offers,
        productImages
    } = useInput<OrderHistoryInfo>()
    const products = useProducts();
    const query = useQuery<{ status?: string }>();
    const orders = useMemo(() => {
        return allOrders.filter(
            (order) => {
                if (query.status) {
                    return order.status === query.status;
                }
                return order.status !== "pending";
            }
        );
    }, [query.status, allOrders])
    if (!orders.length && !query.status) {
        return <CheckoutEmpty />
    }
    return (
        <div className="flex flex-col">
            <div className="flex flex-col">
                {orders.map(order => (
                    <div key={order.orderId}>
                        <h3 className="sr-only">
                            Order placed on <time dateTime={order.createdAt}>{order.createdAt}</time>
                        </h3>

                        <div className="bg-gray-50 px-4 py-6 sm:rounded-lg sm:p-6 md:flex md:items-center md:justify-between md:space-x-6 lg:space-x-8">
                            <dl className="flex-auto space-y-4 divide-y divide-gray-200 text-sm text-gray-600 md:grid md:grid-cols-3 md:gap-x-6 md:space-y-0 md:divide-y-0 lg:w-1/2 lg:flex-none lg:gap-x-8">
                                <div className="flex justify-between md:block">
                                    <dt className="font-medium text-gray-900">Order number</dt>
                                    <dd className="md:mt-1">{order.orderId}</dd>
                                </div>
                                <div className="flex justify-between pt-4 md:block md:pt-0">
                                    <dt className="font-medium text-gray-900">Date placed</dt>
                                    <dd className="md:mt-1">
                                        <time dateTime={order.createdAt}>{order.createdAt}</time>
                                    </dd>
                                </div>
                                <div className="flex justify-between pt-4 font-medium text-gray-900 md:block md:pt-0">
                                    <dt>Total amount</dt>
                                    <dd className="md:mt-1">{order.currencySymbol}{order.total}</dd>
                                </div>
                            </dl>
                            <div className="mt-6 space-y-4 sm:flex sm:space-x-4 sm:space-y-0 md:mt-0">
                                <a
                                    href="#"
                                    className="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 md:w-auto"
                                >
                                    View Invoice
                                    <span className="sr-only">for order {order.orderId}</span>
                                </a>
                            </div>
                        </div>

                        <div className="my-6 flow-root px-4 sm:mt-10 sm:px-0">
                            <div className="-my-6 divide-y divide-gray-200 sm:-my-10">
                                {order.products?.map((item, index) => {
                                    const product = products.find(product => item.productId === product.productId);
                                    if (!product) return undefined;
                                    const image = productImages[product.productId];
                                    const offer = offers.find(offer => item.offerId === offer.offerId);
                                    return (
                                        <div key={index} className="flex py-6 sm:py-10">
                                            <div className="min-w-0 flex-1 lg:flex lg:flex-col">
                                                <div className="lg:flex-1">
                                                    <div className="sm:flex">
                                                        <div>
                                                            <h4 className="font-medium text-gray-900">{product.productName}</h4>
                                                            <p className="mt-2 hidden text-sm text-gray-500 sm:block">{product.description || ""}</p>
                                                        </div>
                                                        <p className="mt-1 font-medium text-gray-900 sm:ml-6 sm:mt-0">{offer?.currencySymbol}{offer?.price}</p>
                                                    </div>
                                                    <div className="mt-2 flex text-sm font-medium sm:mt-4">
                                                        <a href={`/products#product-${product.productId}`} className="text-indigo-600 hover:text-indigo-500">
                                                            View Product
                                                        </a>
                                                        <div className="ml-4 border-l border-gray-200 pl-4 sm:ml-6 sm:pl-6">
                                                            <a href="#" className="text-indigo-600 hover:text-indigo-500">
                                                                Buy Again
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-6 font-medium">
                                    {/*                {order.status === 'delivered' ? (*/}
                                    {/*                    <div className="flex space-x-2">*/}
                                    {/*                        <CheckIcon className="h-6 w-6 flex-none text-green-500" aria-hidden="true" />*/}
                                    {/*                        <p>*/}
                                    {/*                            Delivered*/}
                                    {/*                            <span className="hidden sm:inline">*/}
                                    {/*  {' '}*/}
                                    {/*                                on <time dateTime={product.createdAt}>{product.createdAt}</time>*/}
                                    {/*</span>*/}
                                    {/*                        </p>*/}
                                    {/*                    </div>*/}
                                    {/*                ) : order.status === 'out-for-delivery' ? (*/}
                                    {/*                    <p>Out for delivery</p>*/}
                                    {/*                ) : order.status === 'cancelled' ? (*/}
                                    {/*                    <p className="text-gray-500">Cancelled</p>*/}
                                    {/*                ) : null}*/}
                                                </div>
                                            </div>
                                            <div className="ml-4 flex-shrink-0 sm:order-first sm:m-0 sm:mr-6">
                                                {
                                                    image ? (
                                                        <img
                                                            src={image.url}
                                                            alt={image.description ?? product.productName}
                                                            className="col-start-2 col-end-3 h-20 w-20 rounded-lg object-cover object-center sm:col-start-1 sm:row-span-2 sm:row-start-1 sm:h-40 sm:w-40 lg:h-52 lg:w-52"
                                                        />
                                                    ) : undefined
                                                }
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export const Component = OrderHistory;