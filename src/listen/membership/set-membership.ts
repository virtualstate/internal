import {FastifyInstance} from "fastify";
import {getMembership, MembershipData, membershipSchema, setMembership} from "../../data";
import { authenticate } from "../authentication";

export async function setMembershipRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: MembershipData;
    Params: {
      membershipId: string;
    }
  };

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
      description: "Updated membership",
      ...membershipSchema.membership,
    },
  };

  const schema = {
    description: "Update an existing membership",
    tags: ["membership"],
    summary: "",
    body: membershipSchema.membershipData,
    response,
    params,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  try {
    fastify.put<Schema>("/:membershipId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const { membershipId } = request.params;
        const existing = await getMembership(membershipId);
        const membership = await setMembership({
          // Completely replace excluding created at
          // createdAt must come from the server
          ...request.body,
          createdAt: existing?.createdAt,
          membershipId
        });
        response.status(200);
        response.send(membership);
      },
    });
  } catch {}
}
