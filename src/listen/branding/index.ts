import { FastifyInstance } from "fastify";
import {logoRoutes} from "./logo";
import {paletteRoutes} from "./palette";

export async function brandingRoutes(fastify: FastifyInstance) {
    async function routes(fastify: FastifyInstance) {
        fastify.register(logoRoutes);
        fastify.register(paletteRoutes);
    }

    fastify.register(routes, {
        prefix: "/branding",
    });
}
