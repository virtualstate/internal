import {FastifyInstance} from "fastify";
import {deletePaymentMethodRoutes} from "./delete-payment-method";
import {addPaymentMethodRoutes} from "./add-payment-method";
import {getPaymentMethodRoutes} from "./get-payment-method";
import {listPaymentMethodRoutes} from "./list-payment-methods";
import {patchPaymentMethodRoutes} from "./patch-payment-method";
import {setPaymentMethodRoutes} from "./set-payment-method";

export async function paymentMethodRoutes(fastify: FastifyInstance) {

    async function routes(fastify: FastifyInstance) {
        fastify.register(deletePaymentMethodRoutes);
        fastify.register(addPaymentMethodRoutes);
        fastify.register(getPaymentMethodRoutes);
        fastify.register(listPaymentMethodRoutes);
        fastify.register(patchPaymentMethodRoutes);
        fastify.register(setPaymentMethodRoutes);
    }

    fastify.register(routes, {
        prefix: "/payments/methods"
    });

}