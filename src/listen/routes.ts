// It appears vercel serverless requires strong references
// for inclusion in the file system
import "../references";

import {FastifyInstance} from "fastify";
import {viewRoutes} from "../view";
import {backgroundRoutes} from "./background";
import {systemLogRoutes} from "./system-log";
import {partnerRoutes} from "./partner";
import {authenticationRoutes} from "./auth";
import {productRoutes} from "./product";
import {fileRoutes} from "./file";
import {offerRoutes} from "./offer";
import {orderRoutes} from "./order";
import {orderItemRoutes} from "./order-item";
import {paymentMethodRoutes} from "./payment-method";
import {userCredentialRoutes} from "./user-credential";
import {appointmentRoutes} from "./appointment";
import {changeRoutes} from "./change";
import {membershipRoutes} from "./membership";
import {serviceRoutes} from "./service";
import {brandingRoutes} from "./branding";

export {
    systemLogRoutes,
    partnerRoutes,
    productRoutes,
    offerRoutes,
    orderRoutes,
    orderItemRoutes,
    fileRoutes,
    paymentMethodRoutes,
    userCredentialRoutes,
    appointmentRoutes,
    changeRoutes,
    membershipRoutes,
    serviceRoutes,
    brandingRoutes,
    authenticationRoutes,
    backgroundRoutes,
    // viewRoutes, // Already exported elsewhere
}

export async function routes(fastify: FastifyInstance) {

    async function apiRoutes(fastify: FastifyInstance) {
        fastify.register(systemLogRoutes);
        fastify.register(partnerRoutes);
        fastify.register(productRoutes);
        fastify.register(offerRoutes);
        fastify.register(orderRoutes);
        fastify.register(orderItemRoutes);
        fastify.register(fileRoutes);
        fastify.register(paymentMethodRoutes);
        fastify.register(userCredentialRoutes);
        fastify.register(appointmentRoutes);
        fastify.register(changeRoutes);
        fastify.register(membershipRoutes);
        fastify.register(serviceRoutes);
        fastify.register(brandingRoutes);
    }

    fastify.register(apiRoutes, {
        prefix: "/api/version/1"
    });

    fastify.register(authenticationRoutes, {
        prefix: "/api"
    });

    fastify.register(backgroundRoutes, {
        prefix: "/api"
    });

    fastify.register(viewRoutes);
}