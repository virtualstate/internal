import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {getMaybeAuthenticationState, getMaybeUser, isUnauthenticated} from "../../authentication";
import {deleteAuthenticationState, deleteExternalUser, setAuthenticationState} from "../../data";
import { authenticate } from "../authentication";
import { ok } from "../../is";
import "@fastify/cookie";

export async function logoutResponse(response: FastifyReply) {
  const state = getMaybeAuthenticationState();

  if (state && state.type !== "partner") {
    await deleteAuthenticationState(state.stateId);
    const user = getMaybeUser();
    if (user.externalType === "anonymous") {
      await deleteExternalUser({
        externalId: user.userId,
        externalType: user.externalType
      });
    }
  }


  response.clearCookie("state", {
    path: "/",
    signed: true,
  });
}

export async function logoutRoutes(fastify: FastifyInstance) {
  fastify.get("/logout", {
    preHandler: authenticate(fastify),
    async handler(request, response) {
      ok(!isUnauthenticated(), "Expected authentication");

      await logoutResponse(response);

      response.header("Location", "/");
      response.status(302);
      response.send("Redirecting");
    },
  });
}
