import { FastifyInstance, FastifyRequest } from "fastify";
import { listOrders, orderSchema } from "../../data";
import { authenticate } from "../authentication";
import {getMaybePartner, getMaybeUser, isUnauthenticated} from "../../authentication";

export async function listOrderRoutes(fastify: FastifyInstance) {
  const response = {
    200: {
      type: "array",
      items: orderSchema.order,
    },
  };

  const schema = {
    description: "List of orders",
    tags: ["order"],
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
        response.send(await listOrders({
          location: {
            userId: getMaybeUser()?.userId,
            organisationId: getMaybePartner()?.organisationId
          }
        }));
      },
    });
  } catch { }
}
