import {FastifyInstance} from "fastify";
import { addOffer, OfferData, offerSchema } from "../../data";
import { authenticate } from "../authentication";

export async function addOfferRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: OfferData;
  };

  const response = {
    201: {
      description: "A new offer",
      ...offerSchema.offer,
    },
  };

  const schema = {
    description: "Add a new offer",
    tags: ["offer"],
    summary: "",
    body: offerSchema.offerData,
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
        const offer = await addOffer(request.body);
        response.status(201);
        response.send(offer);
      },
    });
  } catch {}
}
