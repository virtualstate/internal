import {FastifyInstance} from "fastify";
import { getMembership, membershipSchema } from "../../data";
import { authenticate } from "../authentication";
import {isUnauthenticated} from "../../authentication";

export async function getMembershipRoutes(fastify: FastifyInstance) {
  const params = {
    type: "object",
    properties: {
      membershipId: {
        type: "string",
      },
    },
    required: ["membershipId"],
  };

  const response = {
    200: {
      description: "A membership",
      ...membershipSchema.membership,
    },
  };

  const schema = {
    description: "Get a membership",
    tags: ["membership"],
    summary: "",
    response,
    params,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  type Schema = {
    Params: {
      membershipId: string;
    };
  };

  try {
    fastify.get<Schema>("/:membershipId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const membership = await getMembership(request.params.membershipId);
        if (!membership || (isUnauthenticated() && !membership.public)) response.status(404);
        response.send(membership);
      },
    });
  } catch {}
}
