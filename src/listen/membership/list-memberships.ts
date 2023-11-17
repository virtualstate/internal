import { FastifyInstance, FastifyRequest } from "fastify";
import { listMemberships, membershipSchema } from "../../data";
import { authenticate } from "../authentication";
import {isUnauthenticated} from "../../authentication";

export async function listMembershipRoutes(fastify: FastifyInstance) {
  const response = {
    200: {
      type: "array",
      items: membershipSchema.membership,
    },
  };

  const schema = {
    description: "List of memberships",
    tags: ["membership"],
    summary: "",
    response,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  try {
    fastify.get("/", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request: FastifyRequest, response) {
        response.send(await listMemberships({
          public: isUnauthenticated()
        }));
      },
    });
  } catch { }
}
