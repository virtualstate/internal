import {FastifyInstance} from "fastify";
import { addPaymentMethod, PaymentMethodData, paymentMethodSchema } from "../../data";
import { authenticate } from "../authentication";

export async function addPaymentMethodRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: PaymentMethodData;
  };

  const response = {
    201: {
      description: "A new payment method",
      ...paymentMethodSchema.paymentMethod,
    },
  };

  const schema = {
    description: "Add a new payment method",
    tags: ["payment method"],
    summary: "",
    body: paymentMethodSchema.paymentMethodData,
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
        const paymentMethod = await addPaymentMethod(request.body);
        response.status(201);
        response.send(paymentMethod);
      },
    });
  } catch {}
}
