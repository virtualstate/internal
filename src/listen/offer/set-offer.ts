import {FastifyInstance} from "fastify";
import {getOffer, OfferData, offerSchema, setOffer} from "../../data";
import { authenticate } from "../authentication";

export async function setOfferRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: OfferData;
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
    200: {
      description: "Updated offer",
      ...offerSchema.offer,
    },
  };

  const schema = {
    description: "Update an existing offer",
    tags: ["offer"],
    summary: "",
    body: offerSchema.offerData,
    response,
    params,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  try {
    fastify.put<Schema>("/:offerId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const { offerId } = request.params;
        const existing = await getOffer(offerId);
        const offer = await setOffer({
          // Completely replace excluding created at
          // createdAt must come from the server
          ...request.body,
          createdAt: existing?.createdAt,
          offerId
        });
        response.status(200);
        response.send(offer);
      },
    });
  } catch {}
}
