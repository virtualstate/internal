import {FastifyInstance} from "fastify";
import { addMembership, MembershipData, membershipSchema } from "../../data";
import { authenticate } from "../authentication";

export async function addMembershipRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: MembershipData;
  };

  const response = {
    201: {
      description: "A new membership",
      ...membershipSchema.membership,
    },
  };

  const schema = {
    description: "Add a new membership",
    tags: ["membership"],
    summary: "",
    body: membershipSchema.membershipData,
    response,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  try {
    fastify.post<Schema>("/", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const membership = await addMembership(request.body);
        response.status(201);
        response.send(membership);
      },
    });
  } catch {}
}
