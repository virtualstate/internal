import {FastifyInstance} from "fastify";
import {getOrder, isOrderShipmentLocationMatch, OrderData, orderSchema, setOrder} from "../../data";
import { authenticate } from "../authentication";
import {getMaybePartner, getMaybeUser} from "../../authentication";

export async function setOrderRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: OrderData;
    Params: {
      orderId: string;
    }
  };

  const params = {
    type: "object",
    properties: {
      orderId: {
        type: "string",
      },
    },
    required: ["orderId"],
  };

  const response = {
    200: {
      description: "Updated order",
      ...orderSchema.order,
    },
  };

  const schema = {
    description: "Update an existing order",
    tags: ["order"],
    summary: "",
    body: orderSchema.orderData,
    response,
    params,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  try {
    fastify.put<Schema>("/:orderId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const { orderId } = request.params;
        const existing = await getOrder(orderId);
        if (existing) {
          if (!isOrderShipmentLocationMatch(existing, {
            userId: getMaybeUser()?.userId,
            organisationId: getMaybePartner()?.organisationId
          })) {
            response.status(404);
            return response.send();
          }
        }
        const order = await setOrder({
          // Completely replace excluding created at
          // createdAt must come from the server
          ...request.body,
          createdAt: existing?.createdAt,
          orderId
        });
        response.status(200);
        response.send(order);
      },
    });
  } catch {}
}
