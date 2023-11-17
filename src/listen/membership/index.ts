import { FastifyInstance } from "fastify";
import { listMembershipRoutes } from "./list-memberships";
import { addMembershipRoutes } from "./add-membership";
import { getMembershipRoutes } from "./get-membership";
import { setMembershipRoutes } from "./set-membership";
import { patchMembershipRoutes } from "./patch-memberships";
import {setMembershipStatusRoutes} from "./set-membership-status";

export async function membershipRoutes(fastify: FastifyInstance) {
  async function routes(fastify: FastifyInstance) {
    fastify.register(listMembershipRoutes);
    fastify.register(addMembershipRoutes);
    fastify.register(getMembershipRoutes);
    fastify.register(setMembershipRoutes);
    fastify.register(patchMembershipRoutes);
    fastify.register(setMembershipStatusRoutes);
  }

  fastify.register(routes, {
    prefix: "/memberships",
  });
}
