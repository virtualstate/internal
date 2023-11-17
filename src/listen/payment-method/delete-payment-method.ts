import {FastifyInstance, FastifyReply, FastifyRequest} from "fastify";
import {
    getOrder,
    getPaymentMethod,
    deletePaymentMethod,
    paymentMethodSchema,
} from "../../data";
import { authenticate } from "../authentication";
import {getMaybePartner, getMaybeUser} from "../../authentication";

export async function deletePaymentMethodRoutes(fastify: FastifyInstance) {

    type Querystring = {
        redirect?: string;
    }

    try {

        type Params = {
            paymentMethodId: string;
        }

        type Schema = {
            Querystring: Querystring
            Params: Params
        };

        const params = {
            type: "object",
            properties: {
                paymentMethodId: {
                    type: "string"
                }
            },
            required: ["paymentMethodId"]
        };

        const schema = {
            description: "Delete a payment method",
            tags: ["payment method"],
            summary: "",
            params,
            security: [
                {
                    apiKey: [] as string[],
                },
            ],
        };
        async function handler(request: FastifyRequest<Schema>, response: FastifyReply) {
            const { paymentMethodId } = request.params;
            const options = {
                paymentMethodId,
                userId: getMaybeUser()?.userId,
                organisationId: getMaybePartner()?.organisationId
            }
            const paymentMethod = await getPaymentMethod(options);
            if (!paymentMethod) {
                response.status(404);
                response.send();
                return;
            }
            await deletePaymentMethod(paymentMethod);
            const { redirect } = request.query;
            if (redirect) {
                response.header("Location", redirect);
                response.status(302);
                response.send();
                return;
            }
            response.status(204);
            response.send();
        }

        fastify.delete<Schema>("/:paymentMethodId", {
            schema,
            preHandler: authenticate(fastify),
            handler,
        });
        fastify.get<Schema>("/:paymentMethodId/delete", {
            schema,
            preHandler: authenticate(fastify),
            handler,
        });
    } catch {}
}
