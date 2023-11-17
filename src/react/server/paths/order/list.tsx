import {useData, useOffer, useOrders, useProduct, useQuery} from "../../data";
import {listOffers, listOrders} from "../../../../data";
import {getMaybePartner, getMaybeUser, isUnauthenticated} from "../../../../authentication";
import {useMemo} from "react";

export const path = "/orders";
export const anonymous = true;
export const cached = true;

const LINK_CLASS = "text-blue-600 hover:bg-white underline hover:underline-offset-2";

export async function handler() {
    return {
        offers: await listOffers({
           public: isUnauthenticated()
        }),
        orders: await listOrders({
            location: {
                userId: getMaybeUser()?.userId,
                organisationId: getMaybePartner()?.organisationId
            }
        })
    }
}

export function ListOrders() {
    const query = useQuery<{ status?: string }>();
    const allOrders = useOrders();
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
    return (
        <div className="flex flex-col">
            <div className="flex flex-col divide-y">
                {orders.map(order => (
                    <div key={order.orderId} className="flex flex-col">
                        <span>{order.orderId}</span>
                        <span>{order.status}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export const Component = ListOrders;