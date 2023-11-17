import { FastifyInstance, FastifyRequest } from "fastify";
import { listPaymentMethods, paymentMethodSchema } from "../../data";
import { authenticate } from "../authentication";
import {getMaybePartner, getMaybeUser} from "../../authentication";

export async function listPaymentMethodRoutes(fastify: FastifyInstance) {
  const response = {
    200: {
      type: "array",
      items: paymentMethodSchema.paymentMethod,
    },
  };

  const schema = {
    description: "List of payment methods",
    tags: ["payment method"],
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
        response.send(await listPaymentMethods({
          userId: getMaybeUser()?.userId,
          organisationId: getMaybePartner()?.organisationId
        }));
      },
    });
  } catch { }
}
