import { FastifyInstance } from "fastify";
import { discordAuthenticationRoutes } from "./discord";
import { redditAuthenticationRoutes } from "./reddit";
import { authsignalAuthenticationRoutes } from "./authsignal";
import { logoutRoutes } from "./logout";
import { webauthnRoutes } from "./webauthn";
import { anonymousRoutes } from "./anonymous";

export async function authenticationRoutes(fastify: FastifyInstance) {
  async function routes(fastify: FastifyInstance) {
    fastify.register(discordAuthenticationRoutes);
    fastify.register(redditAuthenticationRoutes);
    fastify.register(authsignalAuthenticationRoutes);
    fastify.register(webauthnRoutes);
    fastify.register(logoutRoutes);
    fastify.register(anonymousRoutes);
  }

  fastify.register(routes, {
    prefix: "/authentication",
  });
}
