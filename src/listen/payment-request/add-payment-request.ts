import {FastifyInstance} from "fastify";
import { addPaymentRequest, PaymentRequestData, paymentRequestSchema } from "../../data";
import { authenticate } from "../authentication";

export async function addPaymentRequestRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: PaymentRequestData;
  };

  const response = {
    201: {
      description: "A new payment request",
      ...paymentRequestSchema.paymentRequest,
    },
  };

  const schema = {
    description: "Add a new payment request",
    tags: ["payment request"],
    summary: "",
    body: paymentRequestSchema.paymentRequestData,
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
        const paymentRequest = await addPaymentRequest(request.body);
        response.status(201);
        response.send(paymentRequest);
      },
    });
  } catch {}
}
