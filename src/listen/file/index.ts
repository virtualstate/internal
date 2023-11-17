import { FastifyInstance } from "fastify";
import { getFileImageWatermarkRoutes } from "./get-file-image-watermark";

export async function fileRoutes(fastify: FastifyInstance) {
  async function routes(fastify: FastifyInstance) {
    fastify.register(getFileImageWatermarkRoutes);
  }

  fastify.register(routes, {
    prefix: "/files",
  });
}
