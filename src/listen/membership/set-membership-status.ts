import {FastifyInstance, FastifyReply, FastifyRequest} from "fastify";
import {
  getMembership,
  membershipSchema,
  setMembership,
  MembershipStatus
} from "../../data";
import { authenticate } from "../authentication";

export async function setMembershipStatusRoutes(fastify: FastifyInstance) {
  type Querystring = {
    redirect?: string;
  }

  type Schema = {
    Querystring: Querystring
    Params: {
      membershipId: string;
      status: MembershipStatus;
    }
  };

  const params = {
    type: "object",
    properties: {
      membershipId: {
        type: "string",
      },
      status: membershipSchema.membership.properties.status,
    },
    required: ["membershipId", "status"],
  };

  const response = {
    200: {
      description: "Updated membership",
      ...membershipSchema.membership,
    },
  };

  const schema = {
    description: "Update an existing membership status",
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

  async function handler(request: FastifyRequest<Schema>, response: FastifyReply) {
    const { membershipId, status } = request.params;
    const existing = await getMembership(membershipId);
    if (!existing) {
      response.status(404);
      return response.send();
    }
    let membership = existing;
    if (existing.status !== status) {
      const statusAt = new Date().toISOString();
      membership = await setMembership({
        ...existing,
        status,
        statusAt,
        history: [
          ...(existing.history ?? []),
          {
            status,
            statusAt,
            updatedAt: statusAt
          }
        ]
      });
    }

    const { redirect } = request.query;
    if (redirect) {
      const url = redirect.replace(":membershipId", membershipId);
      response.header("Location", url);
      response.status(302);
      response.send();
      return;
    }

    response.status(200);
    response.send(membership);
  }

  try {
    fastify.put<Schema>("/:membershipId/status/:status", {
      schema,
      preHandler: authenticate(fastify),
      handler
    });
  } catch {}

  try {
    fastify.get<Schema>("/:membershipId/status/:status", {
      schema,
      preHandler: authenticate(fastify),
      handler
    });
  } catch {}
}
