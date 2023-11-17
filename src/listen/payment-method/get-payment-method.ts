import {FastifyInstance} from "fastify";
import { getPaymentMethod, paymentMethodSchema } from "../../data";
import { authenticate } from "../authentication";
import {getMaybePartner, getMaybeUser, isUnauthenticated} from "../../authentication";

export async function getPaymentMethodRoutes(fastify: FastifyInstance) {
  const params = {
    type: "object",
    properties: {
      paymentMethodId: {
        type: "string",
      },
    },
    required: ["paymentMethodId"],
  };

  const response = {
    200: {
      description: "A payment method",
      ...paymentMethodSchema.paymentMethod,
    },
  };

  const schema = {
    description: "Get a payment method",
    tags: ["payment method"],
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
      paymentMethodId: string;
    };
  };

  try {
    fastify.get<Schema>("/:paymentMethodId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const paymentMethod = await getPaymentMethod({
          paymentMethodId: request.params.paymentMethodId,
          userId: getMaybeUser()?.userId,
          organisationId: getMaybePartner()?.organisationId
        });
        if (!paymentMethod || (isUnauthenticated() && !paymentMethod.public)) response.status(404);
        response.send(paymentMethod);
      },
    });
  } catch {}
}
