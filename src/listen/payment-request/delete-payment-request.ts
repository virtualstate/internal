import {FastifyInstance, FastifyReply, FastifyRequest} from "fastify";
import {
    getOrder,
    getPaymentRequest,
    deletePaymentRequest,
    paymentRequestSchema,
} from "../../data";
import { authenticate } from "../authentication";
import {getMaybePartner, getMaybeUser} from "../../authentication";

export async function deletePaymentRequestRoutes(fastify: FastifyInstance) {

    type Querystring = {
        redirect?: string;
    }

    try {

        type Params = {
            paymentRequestId: string;
        }

        type Schema = {
            Querystring: Querystring
            Params: Params
        };

        const params = {
            type: "object",
            properties: {
                paymentRequestId: {
                    type: "string"
                }
            },
            required: ["paymentRequestId"]
        };

        const schema = {
            description: "Delete a payment request",
            tags: ["payment request"],
            summary: "",
            params,
            security: [
                {
                    apiKey: [] as string[],
                },
            ],
        };
        async function handler(request: FastifyRequest<Schema>, response: FastifyReply) {
            const { paymentRequestId } = request.params;
            const options = {
                paymentRequestId,
                userId: getMaybeUser()?.userId,
                organisationId: getMaybePartner()?.organisationId
            }
            const paymentRequest = await getPaymentRequest(options);
            if (!paymentRequest) {
                response.status(404);
                response.send();
                return;
            }
            await deletePaymentRequest(paymentRequest);
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

        fastify.delete<Schema>("/:paymentRequestId", {
            schema,
            preHandler: authenticate(fastify),
            handler,
        });
        fastify.get<Schema>("/:paymentRequestId/delete", {
            schema,
            preHandler: authenticate(fastify),
            handler,
        });
    } catch {}
}
