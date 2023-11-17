import {FastifyInstance} from "fastify";
import {getOrder, isOrderShipmentLocationMatch, OrderData, orderSchema, setOrder} from "../../data";
import { authenticate } from "../authentication";
import {getMaybePartner, getMaybeUser} from "../../authentication";

export async function patchOrderRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: Partial<OrderData>;
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
    201: {
      description: "Updated order",
      ...orderSchema.order,
    },
  };

  const schema = {
    description: "Update an existing order",
    tags: ["order"],
    summary: "",
    body: {
      ...orderSchema.orderData,
      properties: Object.fromEntries(
        Object.entries(orderSchema.orderData.properties)
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
    fastify.patch<Schema>("/:orderId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const { orderId } = request.params;
        const existing = await getOrder(orderId);
        // Patch must have an existing order
        if (!existing) {
          response.status(404);
          return response.send();
        }
        if (!isOrderShipmentLocationMatch(existing, {
          userId: getMaybeUser()?.userId,
          organisationId: getMaybePartner()?.organisationId
        })) {
          response.status(404);
          return response.send();
        }
        const order = await setOrder({
          ...existing,
          ...request.body,
          createdAt: existing.createdAt,
          orderId
        });
        response.status(200);
        response.send(order);
      },
    });
  } catch {
  }
}
