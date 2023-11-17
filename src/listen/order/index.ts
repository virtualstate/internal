import { FastifyInstance } from "fastify";
import { listOrderRoutes } from "./list-orders";
import { addOrderRoutes } from "./add-order";
import { getOrderRoutes } from "./get-order";
import { setOrderRoutes } from "./set-order";
import { patchOrderRoutes } from "./patch-order";

export async function orderRoutes(fastify: FastifyInstance) {
  async function routes(fastify: FastifyInstance) {
    fastify.register(listOrderRoutes);
    fastify.register(addOrderRoutes);
    fastify.register(getOrderRoutes);
    fastify.register(setOrderRoutes);
    fastify.register(patchOrderRoutes);
  }

  fastify.register(routes, {
    prefix: "/orders",
  });
}
