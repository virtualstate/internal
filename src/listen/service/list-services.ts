import { FastifyInstance, FastifyRequest } from "fastify";
import { listServices, serviceSchema } from "../../data";
import { authenticate } from "../authentication";
import {isUnauthenticated} from "../../authentication";

export async function listServiceRoutes(fastify: FastifyInstance) {
  const {
    PUBLIC_SERVICES
  } = process.env;
  const response = {
    200: {
      type: "array",
      items: serviceSchema.service,
    },
  };

  const schema = {
    description: "List of services",
    tags: ["service"],
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
      preHandler: authenticate(fastify, { anonymous: !!PUBLIC_SERVICES }),
      async handler(request: FastifyRequest, response) {
        response.send(await listServices({
          public: isUnauthenticated()
        }));
      },
    });
  } catch { }
}
