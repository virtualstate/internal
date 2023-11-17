import { FastifyInstance } from "fastify";
import { listTaskRoutes } from "./list-tasks";
import { addTaskRoutes } from "./add-task";
import { getTaskRoutes } from "./get-task";
import { setTaskRoutes } from "./set-task";
import { patchTaskRoutes } from "./patch-task";

export async function taskRoutes(fastify: FastifyInstance) {
  async function routes(fastify: FastifyInstance) {
    fastify.register(listTaskRoutes);
    fastify.register(addTaskRoutes);
    fastify.register(getTaskRoutes);
    fastify.register(setTaskRoutes);
    fastify.register(patchTaskRoutes);
  }

  fastify.register(routes, {
    prefix: "/tasks",
  });
}
