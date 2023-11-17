import {FastifyInstance} from "fastify";
import {deletePaymentRequestRoutes} from "./delete-payment-request";
import {addPaymentRequestRoutes} from "./add-payment-request";
import {getPaymentRequestRoutes} from "./get-payment-request";
import {listPaymentRequestRoutes} from "./list-payment-requests";
import {patchPaymentRequestRoutes} from "./patch-payment-request";
import {setPaymentRequestRoutes} from "./set-payment-request";

export async function paymentRequestRoutes(fastify: FastifyInstance) {

    async function routes(fastify: FastifyInstance) {
        fastify.register(deletePaymentRequestRoutes);
        fastify.register(addPaymentRequestRoutes);
        fastify.register(getPaymentRequestRoutes);
        fastify.register(listPaymentRequestRoutes);
        fastify.register(patchPaymentRequestRoutes);
        fastify.register(setPaymentRequestRoutes);
    }

    fastify.register(routes, {
        prefix: "/payments/requests"
    });

}