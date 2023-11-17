import { FastifyInstance } from "fastify";
import { listServiceRoutes } from "./list-services";
import { addServiceRoutes } from "./add-service";
import { getServiceRoutes } from "./get-service";
import { setServiceRoutes } from "./set-service";
import { patchServiceRoutes } from "./patch-service";

export async function serviceRoutes(fastify: FastifyInstance) {
  async function routes(fastify: FastifyInstance) {
    fastify.register(listServiceRoutes);
    fastify.register(addServiceRoutes);
    fastify.register(getServiceRoutes);
    fastify.register(setServiceRoutes);
    fastify.register(patchServiceRoutes);
  }

  fastify.register(routes, {
    prefix: "/services",
  });
}
