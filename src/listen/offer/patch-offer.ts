import {FastifyInstance} from "fastify";
import {getOffer, OfferData, offerSchema, setOffer} from "../../data";
import { authenticate } from "../authentication";

export async function patchOfferRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: Partial<OfferData>;
    Params: {
      offerId: string;
    }
  };

  const params = {
    type: "object",
    properties: {
      offerId: {
        type: "string",
      },
    },
    required: ["offerId"],
  };

  const response = {
    201: {
      description: "Updated offer",
      ...offerSchema.offer,
    },
  };

  const schema = {
    description: "Update an existing offer",
    tags: ["offer"],
    summary: "",
    body: {
      ...offerSchema.offerData,
      properties: Object.fromEntries(
        Object.entries(offerSchema.offerData.properties)
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
    fastify.patch<Schema>("/:offerId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const { offerId } = request.params;
        const existing = await getOffer(offerId);
        // Patch must have an existing offer
        if (!existing) {
          response.status(404);
          return response.send();
        }
        const offer = await setOffer({
          ...existing,
          ...request.body,
          createdAt: existing.createdAt,
          offerId
        });
        response.status(200);
        response.send(offer);
      },
    });
  } catch {
  }
}
