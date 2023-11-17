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

export async function setPaymentRequestRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: PaymentRequestData;
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
    200: {
      description: "Updated paymentRequest",
      ...paymentRequestSchema.paymentRequest,
    },
  };

  const schema = {
    description: "Update an existing paymentRequest",
    tags: ["payment request"],
    summary: "",
    body: paymentRequestSchema.paymentRequestData,
    response,
    params,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  try {
    fastify.put<Schema>("/:paymentRequestId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const { paymentRequestId } = request.params;
        let identifiers: PaymentRequestOwnerIdentifiers = {
          userId: getMaybeUser()?.userId,
          organisationId: getMaybePartner()?.organisationId
        }
        const existing = await getPaymentRequest({
          paymentRequestId,
          ...identifiers
        });
        if (existing) {
          identifiers = {
            userId: existing.userId,
            organisationId: existing.organisationId
          };
        }
        const paymentRequest = await setPaymentRequest({
          // Completely replace excluding created at
          // createdAt must come from the server
          ...request.body,
          ...identifiers,
          createdAt: existing?.createdAt,
          paymentRequestId
        });
        response.status(200);
        response.send(paymentRequest);
      },
    });
  } catch {}
}
