import {useData, useInput, useIsTrusted, useServices} from "../../data";
import {listServiceFiles, File, listOffers, Offer, Order, getUserPendingOrder} from "../../../../data";
import {getUser, isUnauthenticated} from "../../../../authentication";
import {ok} from "../../../../is";
import {useMemo} from "react";
import {TrashIcon} from "../../../client/components/icons";
import {ServicesEmpty} from "../../../client/components/services";

const {
    PUBLIC_SERVICES,
    GENERIC_SERVICES
} = process.env;

export const path = "/services";
export const anonymous = !!PUBLIC_SERVICES;

export interface ServiceListComponentInfo {
    images600: File[]
    serviceImages: Record<string, File>
    offers: Offer[];
    order: Order;
}

type Params = {
    serviceId: string;
}

type Schema = {
    Params: Params
}

export async function handler(): Promise<ServiceListComponentInfo> {
    const images600 = (
        await listServiceFiles({
            public: isUnauthenticated(),
            size: 600,
        })
    ).filter(file => file.pinned);
    const serviceImages = Object.fromEntries(
        images600.map(
            image => {
                const { serviceId } = image;
                ok(typeof serviceId === "string");
                return [serviceId, image] as const;
            }
        )
    )
    const offers = await listOffers({
        public: isUnauthenticated()
    })
    const order = await getUserPendingOrder(getUser().userId)
    return { images600, serviceImages, offers, order };
}

const LINK_CLASS = "text-blue-600 hover:bg-white underline hover:underline-offset-2";

export function ListServices() {
    const services = useServices();
    const { isUnauthenticated, url } = useData();
    const { pathname } = new URL(url);
    const isTrusted = useIsTrusted();
    const { images600, serviceImages, offers, order, order: { orderId } } = useInput<ServiceListComponentInfo>();
    const sorted = useMemo(() => {
        return [...services]
            .filter(service => GENERIC_SERVICES || isTrusted || !service.generic)
            .sort((a, b) => {
                if (serviceImages[a.serviceId] && !serviceImages[b.serviceId]) {
                    return -1;
                }
                if (!serviceImages[a.serviceId] && serviceImages[b.serviceId]) {
                    return 1;
                }
                return services.indexOf(a) < services.indexOf(b) ? -1 : 1;
            })
    }, [services, serviceImages]);
    const isImages = !!images600.length;
    if (!sorted.length) {
        return <ServicesEmpty isTrusted={isTrusted} />
    }
    return (
        <div className="bg-white" id="service-list">
            <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:max-w-7xl lg:px-8">
                <div className="mt-8 grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 xl:gap-x-8">
                    {sorted.map(service => {
                        const images = images600.filter(file => file.serviceId === service.serviceId);
                        const serviceOffer = offers.find(offer => (
                            offer.items.length === 1 &&
                            offer.items.find(item => item.type === "service" && item.serviceId === service.serviceId)
                        ));
                        const inOrder = order.services
                            .filter(value => value.serviceId === service.serviceId)
                            .reduce((sum, value) => sum + (value.quantity ?? 1), 0);
                        // if (inOrder) {
                        //     console.log({ inOrder, service: service.serviceName });
                        // }
                        const redirect = encodeURIComponent(`${pathname}#service-${service.serviceId}`);
                        return (
                            <div key={service.serviceId} id={`service-${service.serviceId}`} className="flex justify-between flex-col">
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
                                                                alt={String(image.description || service.serviceName)}
                                                                className="h-full w-full object-cover object-center"
                                                            />
                                                        )
                                                    )
                                                }
                                            </div>
                                            <div className="relative mt-4">
                                                <h3 className="text-sm font-medium text-gray-900">{service.serviceName}</h3>
                                                {/*<p className="mt-1 text-sm text-gray-500"></p>*/}
                                            </div>
                                            <div className="absolute inset-x-0 top-0 flex h-72 items-end justify-end overflow-hidden rounded-lg p-4">
                                                <div
                                                    aria-hidden="true"
                                                    className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black opacity-50"
                                                />
                                                <p className="relative text-lg font-semibold text-white">{serviceOffer ? `${serviceOffer.currencyCode ?? "$"}${serviceOffer.price}` : ""}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative mt-4">
                                            <h3 className="text-sm font-medium text-gray-900 flex flex-row justify-between">
                                                <span>{service.serviceName}</span>
                                                <span>{serviceOffer ? `${serviceOffer.currencyCode ?? "$"}${serviceOffer.price}` : ""}</span>
                                            </h3>
                                        </div>
                                    )
                                }
                                <div className="mt-6 flex flex-row" id={`service-${service.serviceId}-order`}>
                                    <a
                                        href={`/api/version/1/orders/${orderId}/items/${serviceOffer ? "offers" : "services"}/${serviceOffer ? serviceOffer.offerId : service.serviceId}/add?redirect=${redirect}`}
                                        className="relative flex-1 flex items-center justify-center rounded-md border border-transparent bg-gray-100 px-8 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
                                    >
                                        Add to bag<span className="sr-only">, {service.serviceName}</span>
                                    </a>
                                    {
                                        inOrder ? (
                                            <a
                                                href={`/api/version/1/orders/${orderId}/items/${serviceOffer ? "offers" : "services"}/${serviceOffer ? serviceOffer.offerId : service.serviceId}/delete?redirect=${redirect}`}
                                                className="relative flex items-center justify-center rounded-md border border-transparent bg-gray-100 px-2 py-2 ml-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
                                                title={`Remove ${inOrder} ${service.serviceName} from bag`}
                                            >
                                                <TrashIcon className="w-5 h-5" />&nbsp;{inOrder}
                                                <span className="sr-only">Remove {inOrder} {service.serviceName} from bag</span>
                                            </a>
                                        ) : undefined
                                    }
                                    {
                                        isTrusted && !serviceOffer ? (
                                            <a
                                                href={`/offer/create?serviceId=${service.serviceId}&redirect=${redirect}`}
                                                className="relative flex items-center justify-center rounded-md border border-transparent bg-gray-100 px-2 py-2 ml-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
                                                title={`Create offer for ${service.serviceName}`}
                                            >
                                                Create offer<span className="sr-only"> for {service.serviceName}</span>
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

export const Component = ListServices;