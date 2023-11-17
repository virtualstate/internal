import {FastifyInstance} from "fastify";
import {
  getOrder,
  getOrderItem,
  OrderItemData,
  orderItemSchema,
  setOrderItem
} from "../../data";
import { authenticate } from "../authentication";
import {getMaybePartner, getMaybeUser} from "../../authentication";

export async function patchOrderItemRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: Partial<OrderItemData>;
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
    201: {
      description: "Updated order item",
      ...orderItemSchema.orderItem,
    },
  };

  const schema = {
    description: "Update an existing order item",
    tags: ["order item"],
    summary: "",
    body: {
      ...orderItemSchema.orderItemData,
      properties: Object.fromEntries(
        Object.entries(orderItemSchema.orderItemData.properties)
            .map(([key, value]) => {
              if (typeof value !== "object" || Array.isArray(value)) return [key, value];
              return [key, {
                ...value,
                nullable: true
              }]
            })
      ),
      required: [] as string[]
    },
    response,
    params,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  try {
    fastify.patch<Schema>("/:orderItemId", {
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
        // Patch must have an existing orderItem
        if (!existing) {
          response.status(404);
          return response.send();
        }
        const orderItem = await setOrderItem({
          ...existing,
          ...request.body,
          createdAt: existing.createdAt,
          orderItemId
        });
        response.status(200);
        response.send(orderItem);
      },
    });
  } catch {
  }
}
