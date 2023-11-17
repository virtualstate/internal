import { FastifyInstance, FastifyRequest } from "fastify";
import { listOffers, offerSchema } from "../../data";
import { authenticate } from "../authentication";
import {isUnauthenticated} from "../../authentication";

export async function listOfferRoutes(fastify: FastifyInstance) {
  const response = {
    200: {
      type: "array",
      items: offerSchema.offer,
    },
  };

  const schema = {
    description: "List of offers",
    tags: ["offer"],
    summary: "",
    response,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  try {
    fastify.get("/", {
      schema,
      preHandler: authenticate(fastify, { anonymous: true }),
      async handler(request: FastifyRequest, response) {
        response.send(await listOffers({
          public: isUnauthenticated()
        }));
      },
    });
  } catch { }
}
