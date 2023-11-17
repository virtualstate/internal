import {FastifyInstance} from "fastify";
import {
  getPaymentRequest,
  PaymentRequestData,
  PaymentRequestOwnerIdentifiers,
  paymentRequestSchema,
  setPaymentRequest
} from "../../data";
import { authenticate } from "../authentication";
import {getMaybePartner, getMaybeUser} from "../../authentication";

export async function patchPaymentRequestRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: Partial<PaymentRequestData>;
    Params: {
      paymentRequestId: string;
    }
  };

  const params = {
    type: "object",
    properties: {
      paymentRequestId: {
        type: "string",
      },
    },
    required: ["paymentRequestId"],
  };

  const response = {
    201: {
      description: "Updated paymentRequest",
      ...paymentRequestSchema.paymentRequest,
    },
  };

  const schema = {
    description: "Update an existing paymentRequest",
    tags: ["payment request"],
    summary: "",
    body: {
      ...paymentRequestSchema.paymentRequestData,
      properties: Object.fromEntries(
        Object.entries(paymentRequestSchema.paymentRequestData.properties)
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
    fastify.patch<Schema>("/:paymentRequestId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const { paymentRequestId } = request.params;
        const existing = await getPaymentRequest({
          paymentRequestId,
          userId: getMaybeUser()?.userId,
          organisationId: getMaybePartner()?.organisationId
        });
        // Patch must have an existing paymentRequest
        if (!existing) {
          response.status(404);
          return response.send();
        }

        const paymentRequest = await setPaymentRequest({
          ...existing,
          ...request.body,
          userId: existing.userId,
          organisationId: existing.organisationId,
          createdAt: existing.createdAt,
          paymentRequestId
        });
        response.status(200);
        response.send(paymentRequest);
      },
    });
  } catch {
  }
}
