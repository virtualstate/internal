import { FastifyInstance } from "fastify";
import { listChangeRoutes } from "./list-changes";
import { addChangeRoutes } from "./add-change";
import { getChangeRoutes } from "./get-change";
import { setChangeRoutes } from "./set-change";
import { patchChangeRoutes } from "./patch-change";

export async function changeRoutes(fastify: FastifyInstance) {
  async function routes(fastify: FastifyInstance) {
    fastify.register(listChangeRoutes);
    fastify.register(addChangeRoutes);
    fastify.register(getChangeRoutes);
    fastify.register(setChangeRoutes);
    fastify.register(patchChangeRoutes);
  }

  fastify.register(routes, {
    prefix: "/changes/:changeType/:targetType",
  });
}
