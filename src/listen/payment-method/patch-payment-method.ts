import {FastifyInstance} from "fastify";
import {
  getPaymentMethod,
  PaymentMethodData,
  paymentMethodSchema,
  setPaymentMethod
} from "../../data";
import { authenticate } from "../authentication";
import {getMaybePartner, getMaybeUser} from "../../authentication";

export async function patchPaymentMethodRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: Partial<PaymentMethodData>;
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
    201: {
      description: "Updated paymentMethod",
      ...paymentMethodSchema.paymentMethod,
    },
  };

  const schema = {
    description: "Update an existing paymentMethod",
    tags: ["payment method"],
    summary: "",
    body: {
      ...paymentMethodSchema.paymentMethodData,
      properties: Object.fromEntries(
        Object.entries(paymentMethodSchema.paymentMethodData.properties)
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
    fastify.patch<Schema>("/:paymentMethodId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const { paymentMethodId } = request.params;
        const existing = await getPaymentMethod({
          paymentMethodId,
          userId: getMaybeUser()?.userId,
          organisationId: getMaybePartner()?.organisationId
        });
        // Patch must have an existing paymentMethod
        if (!existing) {
          response.status(404);
          return response.send();
        }

        const paymentMethod = await setPaymentMethod({
          ...existing,
          ...request.body,
          userId: existing.userId,
          organisationId: existing.organisationId,
          createdAt: existing.createdAt,
          paymentMethodId
        });
        response.status(200);
        response.send(paymentMethod);
      },
    });
  } catch {
  }
}
