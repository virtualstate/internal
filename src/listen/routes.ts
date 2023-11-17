// It appears vercel serverless requires strong references
// for inclusion in the file system
import "../references";

import {FastifyInstance} from "fastify";
import {viewRoutes} from "../view";
import {backgroundRoutes} from "./background";
import {systemLogRoutes} from "./system-log";
import {authenticationRoutes} from "./auth";
import {fileRoutes} from "./file";
import {userCredentialRoutes} from "./user-credential";
import {changeRoutes} from "./change";
import {brandingRoutes} from "./branding";

export {
    systemLogRoutes,
    fileRoutes,
    userCredentialRoutes,
    changeRoutes,
    brandingRoutes,
    authenticationRoutes,
    backgroundRoutes,
    // viewRoutes, // Already exported elsewhere
}

export async function routes(fastify: FastifyInstance) {

    async function apiRoutes(fastify: FastifyInstance) {
        fastify.register(systemLogRoutes);
        fastify.register(fileRoutes);
        fastify.register(userCredentialRoutes);
        fastify.register(changeRoutes);
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