import {FastifyInstance} from "fastify";
import {
  getPaymentMethod,
  PaymentMethodData,
  PaymentMethodOwnerIdentifiers,
  paymentMethodSchema,
  setPaymentMethod
} from "../../data";
import { authenticate } from "../authentication";
import {getMaybePartner, getMaybeUser} from "../../authentication";

export async function setPaymentMethodRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: PaymentMethodData;
    Params: {
      paymentMethodId: string;
    }
  };

  const params = {
    type: "object",
    properties: {
      paymentMethodId: {
        type: "string",
      },
    },
    required: ["paymentMethodId"],
  };

  const response = {
    200: {
      description: "Updated paymentMethod",
      ...paymentMethodSchema.paymentMethod,
    },
  };

  const schema = {
    description: "Update an existing paymentMethod",
    tags: ["payment method"],
    summary: "",
    body: paymentMethodSchema.paymentMethodData,
    response,
    params,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  try {
    fastify.put<Schema>("/:paymentMethodId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const { paymentMethodId } = request.params;
        let identifiers: PaymentMethodOwnerIdentifiers = {
          userId: getMaybeUser()?.userId,
          organisationId: getMaybePartner()?.organisationId
        }
        const existing = await getPaymentMethod({
          paymentMethodId,
          ...identifiers
        });
        if (existing) {
          identifiers = {
            userId: existing.userId,
            organisationId: existing.organisationId
          };
        }
        const paymentMethod = await setPaymentMethod({
          // Completely replace excluding created at
          // createdAt must come from the server
          ...request.body,
          ...identifiers,
          createdAt: existing?.createdAt,
          paymentMethodId
        });
        response.status(200);
        response.send(paymentMethod);
      },
    });
  } catch {}
}
