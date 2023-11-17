import { FastifyInstance } from "fastify";
import { listOfferRoutes } from "./list-offers";
import { addOfferRoutes } from "./add-offer";
import { getOfferRoutes } from "./get-offer";
import { setOfferRoutes } from "./set-offer";
import { patchOfferRoutes } from "./patch-offer";

export async function offerRoutes(fastify: FastifyInstance) {
  async function routes(fastify: FastifyInstance) {
    fastify.register(listOfferRoutes);
    fastify.register(addOfferRoutes);
    fastify.register(getOfferRoutes);
    fastify.register(setOfferRoutes);
    fastify.register(patchOfferRoutes);
  }

  fastify.register(routes, {
    prefix: "/offers",
  });
}
