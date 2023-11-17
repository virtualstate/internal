import {FastifyInstance} from "fastify";
import {background} from "../background";
import {authenticateSignature} from "./authentication";

export async function backgroundRoutes(fastify: FastifyInstance) {

    try {
        fastify.get("/background", {
            async handler(request, response) {

                await background({
                    query: request.query
                });

                response.status(200);
                response.send();

            }
        });
    } catch {}

    try {
        fastify.post("/event", {
            config: {
              rawBody: true
            },
            preHandler: authenticateSignature(fastify, { internal: true }),
            async handler(request, response) {

                console.log("Event received", request.body)

                await background({
                    query: request.body
                });

                response.status(200);
                response.send();

            }
        });
    } catch {}

}