import { FastifyInstance, FastifyRequest } from "fastify";
import {getOrder, listOrderItems, orderItemSchema} from "../../data";
import { authenticate } from "../authentication";
import {getMaybePartner, getMaybeUser, isUnauthenticated} from "../../authentication";

export async function listOrderItemRoutes(fastify: FastifyInstance) {
  const params = {
    type: "object",
    properties: {
      orderId: {
        type: "string"
      }
    },
    required: ["orderId"]
  };

  const response = {
    200: {
      type: "array",
      items: orderItemSchema.orderItem,
    },
  };

  const schema = {
    description: "List of order items",
    tags: ["order item"],
    summary: "",
    response,
    params,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  type Params = {
    orderId: string;
  }

  type Schema = {
    Params: Params
  }

  try {
    fastify.get<Schema>("/", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const order = await getOrder(request.params.orderId, {
          userId: getMaybeUser()?.userId,
          organisationId: getMaybePartner()?.organisationId
        });
        if (!order) {
          response.status(404);
          response.send();
          return;
        }
        response.send(await listOrderItems(request.params.orderId));
      },
    });
  } catch { }
}
