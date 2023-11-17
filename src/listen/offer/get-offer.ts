import {FastifyInstance} from "fastify";
import { getOffer, offerSchema } from "../../data";
import { authenticate } from "../authentication";
import {isUnauthenticated} from "../../authentication";

export async function getOfferRoutes(fastify: FastifyInstance) {
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
      description: "A offer",
      ...offerSchema.offer,
    },
  };

  const schema = {
    description: "Get a offer",
    tags: ["offer"],
    summary: "",
    response,
    params,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  type Schema = {
    Params: {
      offerId: string;
    };
  };

  try {
    fastify.get<Schema>("/:offerId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const offer = await getOffer(request.params.offerId);
        if (!offer || (isUnauthenticated() || !offer.public)) response.status(404);
        response.send(offer);
      },
    });
  } catch {}
}
