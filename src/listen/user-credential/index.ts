import {FastifyInstance} from "fastify";
import {deleteUserCredentialRoutes} from "./delete-user-credential";

export async function userCredentialRoutes(fastify: FastifyInstance) {

    async function routes(fastify: FastifyInstance) {
        fastify.register(deleteUserCredentialRoutes);
    }

    fastify.register(routes, {
        prefix: "/users/:userId/credentials"
    });

}