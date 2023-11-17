import { FastifyInstance } from "fastify";
import { listOrderItemRoutes } from "./list-order-items";
import { addOrderItemRoutes } from "./add-order-item";
import { getOrderItemRoutes } from "./get-order-item";
import { setOrderItemRoutes } from "./set-order-item";
import { patchOrderItemRoutes } from "./patch-order-item";
import {deleteOrderItemRoutes} from "./delete-order-item";

export async function orderItemRoutes(fastify: FastifyInstance) {
  async function routes(fastify: FastifyInstance) {
    fastify.register(listOrderItemRoutes);
    fastify.register(addOrderItemRoutes);
    fastify.register(getOrderItemRoutes);
    fastify.register(setOrderItemRoutes);
    fastify.register(patchOrderItemRoutes);
    fastify.register(deleteOrderItemRoutes);
  }

  fastify.register(routes, {
    prefix: "/orders/:orderId/items/",
  });
}
