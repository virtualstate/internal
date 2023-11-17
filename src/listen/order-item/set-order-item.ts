import {FastifyInstance} from "fastify";
import {getOrder, getOrderItem, OrderItemData, orderItemSchema, setOrderItem} from "../../data";
import { authenticate } from "../authentication";
import {getMaybePartner, getMaybeUser} from "../../authentication";

export async function setOrderItemRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: OrderItemData;
    Params: {
      orderId: string;
      orderItemId: string;
    }
  };

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
      description: "Updated orderItem",
      ...orderItemSchema.orderItem,
    },
  };

  const schema = {
    description: "Update an existing orderItem",
    tags: ["orderItem"],
    summary: "",
    body: orderItemSchema.orderItemData,
    response,
    params,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  try {
    fastify.put<Schema>("/:orderItemId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const { orderId, orderItemId } = request.params;
        const order = await getOrder(orderId, {
          userId: getMaybeUser()?.userId,
          organisationId: getMaybePartner()?.organisationId
        });
        if (!order) {
          response.status(404);
          response.send();
          return;
        }
        const existing = await getOrderItem(orderId, orderItemId);
        const orderItem = await setOrderItem({
          // Completely replace excluding created at
          // createdAt must come from the server
          ...request.body,
          createdAt: existing?.createdAt,
          orderItemId,
          orderId
        });
        response.status(200);
        response.send(orderItem);
      },
    });
  } catch {}
}
