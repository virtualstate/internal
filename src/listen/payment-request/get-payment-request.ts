import {FastifyInstance} from "fastify";
import { getPaymentRequest, paymentRequestSchema } from "../../data";
import { authenticate } from "../authentication";
import {getMaybePartner, getMaybeUser, isUnauthenticated} from "../../authentication";

export async function getPaymentRequestRoutes(fastify: FastifyInstance) {
  const params = {
    type: "object",
    properties: {
      paymentRequestId: {
        type: "string",
      },
    },
    required: ["paymentRequestId"],
  };

  const response = {
    200: {
      description: "A payment request",
      ...paymentRequestSchema.paymentRequest,
    },
  };

  const schema = {
    description: "Get a payment request",
    tags: ["payment request"],
    summary: "",
    response,
    params,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  type Schema = {
    Params: {
      paymentRequestId: string;
    };
  };

  try {
    fastify.get<Schema>("/:paymentRequestId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const paymentRequest = await getPaymentRequest({
          paymentRequestId: request.params.paymentRequestId,
          userId: getMaybeUser()?.userId,
          organisationId: getMaybePartner()?.organisationId
        });
        if (!paymentRequest || (isUnauthenticated() && !paymentRequest.public)) response.status(404);
        response.send(paymentRequest);
      },
    });
  } catch {}
}
