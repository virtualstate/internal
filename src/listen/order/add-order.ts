import { FastifyInstance } from "fastify";
import { addOrder, OrderData, orderSchema } from "../../data";
import { authenticate } from "../authentication";

export async function addOrderRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: OrderData;
  };

  const response = {
    201: {
      description: "A new order",
      ...orderSchema.order,
    },
  };

  const schema = {
    description: "Add a new order",
    tags: ["order"],
    summary: "",
    body: orderSchema.orderData,
    response,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  try {
    fastify.post<Schema>("/", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const order = await addOrder(request.body);
        response.status(201);
        response.send(order);
      },
    });
  } catch {}
}
