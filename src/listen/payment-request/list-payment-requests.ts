import { FastifyInstance, FastifyRequest } from "fastify";
import { listPaymentRequests, paymentRequestSchema } from "../../data";
import { authenticate } from "../authentication";
import {getMaybePartner, getMaybeUser, isUnauthenticated} from "../../authentication";

export async function listPaymentRequestRoutes(fastify: FastifyInstance) {
  const response = {
    200: {
      type: "array",
      items: paymentRequestSchema.paymentRequest,
    },
  };

  const schema = {
    description: "List of payment requests",
    tags: ["payment request"],
    summary: "",
    response,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  try {
    fastify.get("/", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request: FastifyRequest, response) {
        response.send(await listPaymentRequests({
          userId: getMaybeUser()?.userId,
          organisationId: getMaybePartner()?.organisationId
        }));
      },
    });
  } catch { }
}
