import {FastifyInstance} from "fastify";
import {getMembership, MembershipData, membershipSchema, setMembership} from "../../data";
import { authenticate } from "../authentication";

export async function patchMembershipRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: Partial<MembershipData>;
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
    201: {
      description: "Updated membership",
      ...membershipSchema.membership,
    },
  };

  const schema = {
    description: "Update an existing membership",
    tags: ["membership"],
    summary: "",
    body: {
      ...membershipSchema.membershipData,
      properties: Object.fromEntries(
        Object.entries(membershipSchema.membershipData.properties)
            .map(([key, value]) => {
              if (typeof value !== "object" || Array.isArray(value)) return [key, value];
              return [key, {
                ...value,
                nullable: true
              }]
            })
      ),
      required: [] as string[]
    },
    response,
    params,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  try {
    fastify.patch<Schema>("/:membershipId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const { membershipId } = request.params;
        const existing = await getMembership(membershipId);
        // Patch must have an existing membership
        if (!existing) {
          response.status(404);
          return response.send();
        }
        const membership = await setMembership({
          ...existing,
          ...request.body,
          createdAt: existing.createdAt,
          membershipId
        });
        response.status(200);
        response.send(membership);
      },
    });
  } catch {
  }
}
