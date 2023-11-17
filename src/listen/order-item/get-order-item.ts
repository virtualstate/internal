import {FastifyInstance} from "fastify";
import {getOrder, getOrderItem, orderItemSchema} from "../../data";
import { authenticate } from "../authentication";
import {getMaybePartner, getMaybeUser, getUser, isUnauthenticated} from "../../authentication";
import {ok} from "../../is";

export async function getOrderItemRoutes(fastify: FastifyInstance) {
  const params = {
    type: "object",
    properties: {
      orderId: {
        type: "string",
      },
      orderItemId: {
        type: "string",
      },
    },
    required: ["orderId", "orderItemId"],
  };

  const response = {
    200: {
      description: "An order item",
      ...orderItemSchema.orderItem,
    },
  };

  try {

    const schema = {
      description: "Get an order item",
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

    type Schema = {
      Params: {
        orderId: string;
        orderItemId: string;
      };
    };

    fastify.get<Schema>("/:orderItemId", {
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
        const orderItem = await getOrderItem(request.params.orderId, request.params.orderItemId);
        if (!orderItem) response.status(404);
        response.send(orderItem);
      },
    });
  } catch {}
}
