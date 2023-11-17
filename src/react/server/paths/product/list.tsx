import {useData, useInput, useIsTrusted, useProducts} from "../../data";
import {listProductFiles, File, listOffers, Offer, Order, getUserPendingOrder} from "../../../../data";
import {getUser, isUnauthenticated} from "../../../../authentication";
import {FastifyRequest} from "fastify";
import {ok} from "../../../../is";
import {useMemo} from "react";
import {TrashIcon} from "../../../client/components/icons";
import {ProductsEmpty} from "../../../client/components/products";


const {
    PUBLIC_PRODUCTS,
    GENERIC_PRODUCTS
} = process.env;

export const path = "/products";
export const anonymous = !!PUBLIC_PRODUCTS;

export interface ProductListComponentInfo {
    images600: File[]
    productImages: Record<string, File>
    offers: Offer[];
    order: Order;
}

type Params = {
    productId: string;
}

type Schema = {
    Params: Params
}

export async function handler(): Promise<ProductListComponentInfo> {
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
    const offers = await listOffers({
        public: isUnauthenticated()
    })
    const order = await getUserPendingOrder(getUser().userId)
    return { images600, productImages, offers, order };
}

const LINK_CLASS = "text-blue-600 hover:bg-white underline hover:underline-offset-2";

export function ListProducts() {
    const products = useProducts();
    const isTrusted = useIsTrusted();
    const { isUnauthenticated, url } = useData();
    const { pathname } = new URL(url);
    const { images600, productImages, offers, order, order: { orderId } } = useInput<ProductListComponentInfo>();
    const sorted = useMemo(() => {
        return [...products]
            .filter(product => GENERIC_PRODUCTS || isTrusted || !product.generic)
            .sort((a, b) => {
                if (productImages[a.productId] && !productImages[b.productId]) {
                    return -1;
                }
                if (!productImages[a.productId] && productImages[b.productId]) {
                    return 1;
                }
                return products.indexOf(a) < products.indexOf(b) ? -1 : 1;
            })
    }, [products, productImages]);
    const isImages = !!images600.length;
    if (!sorted.length) {
        return <ProductsEmpty isTrusted={isTrusted} />
    }
    return (
        <div className="bg-white" id="product-list">
            <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:max-w-7xl lg:px-8">
                <div className="mt-8 grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 xl:gap-x-8">
                    {sorted.map(product => {
                        const images = images600.filter(file => file.productId === product.productId);
                        const productOffer = offers.find(offer => (
                            offer.items.length === 1 &&
                            offer.items.find(item => item.type === "product" && item.productId === product.productId)
                        ));
                        const inOrder = order.products
                            .filter(value => value.productId === product.productId)
                            .reduce((sum, value) => sum + (value.quantity ?? 1), 0);
                        // if (inOrder) {
                        //     console.log({ inOrder, product: product.productName });
                        // }
                        const redirect = encodeURIComponent(`${pathname}#product-${product.productId}`);
                        return (
                            <div key={product.productId} id={`product-${product.productId}`} className="flex justify-between flex-col">
                                {
                                    isImages ? (
                                        <div className="relative">
                                            <div className="relative h-72 w-full overflow-hidden rounded-lg">
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
                                                                className="h-full w-full object-cover object-center"
                                                            />
                                                        )
                                                    )
                                                }
                                            </div>
                                            <div className="relative mt-4">
                                                <h3 className="text-sm font-medium text-gray-900">{product.productName}</h3>
                                                <p className="mt-1 text-sm text-gray-500"></p>
                                            </div>
                                            <div className="absolute inset-x-0 top-0 flex h-72 items-end justify-end overflow-hidden rounded-lg p-4">
                                                <div
                                                    aria-hidden="true"
                                                    className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black opacity-50"
                                                />
                                                <p className="relative text-lg font-semibold text-white">{productOffer ? `${productOffer.currencyCode ?? "$"}${productOffer.price}` : ""}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative mt-4">
                                            <h3 className="text-sm font-medium text-gray-900 flex flex-row justify-between">
                                                <span>{product.productName}</span>
                                                <span>{productOffer ? `${productOffer.currencyCode ?? "$"}${productOffer.price}` : ""}</span>
                                            </h3>
                                        </div>
                                    )
                                }
                                <div className="mt-6 flex flex-row" id={`product-${product.productId}-order`}>
                                    <a
                                        href={`/api/version/1/orders/${orderId}/items/${productOffer ? "offers" : "products"}/${productOffer ? productOffer.offerId : product.productId}/add?redirect=${redirect}`}
                                        className="relative flex-1 flex items-center justify-center rounded-md border border-transparent bg-gray-100 px-8 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
                                    >
                                        Add to bag<span className="sr-only">, {product.productName}</span>
                                    </a>
                                    {
                                        inOrder ? (
                                            <a
                                                href={`/api/version/1/orders/${orderId}/items/${productOffer ? "offers" : "products"}/${productOffer ? productOffer.offerId : product.productId}/delete?redirect=${redirect}`}
                                                className="relative flex items-center justify-center rounded-md border border-transparent bg-gray-100 px-2 py-2 ml-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
                                                title={`Remove ${inOrder} ${product.productName} from bag`}
                                            >
                                                <TrashIcon className="w-5 h-5" />&nbsp;{inOrder}
                                                <span className="sr-only">Remove {inOrder} {product.productName} from bag</span>
                                            </a>
                                        ) : undefined
                                    }
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export const Component = ListProducts;