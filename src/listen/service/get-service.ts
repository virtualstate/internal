import {FastifyInstance} from "fastify";
import { getService, serviceSchema } from "../../data";
import { authenticate } from "../authentication";
import {isUnauthenticated} from "../../authentication";

export async function getServiceRoutes(fastify: FastifyInstance) {
  const params = {
    type: "object",
    properties: {
      serviceId: {
        type: "string",
      },
    },
    required: ["serviceId"],
  };

  const response = {
    200: {
      description: "A service",
      ...serviceSchema.service,
    },
  };

  const schema = {
    description: "Get a service",
    tags: ["service"],
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
      serviceId: string;
    };
  };

  try {
    fastify.get<Schema>("/:serviceId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const service = await getService(request.params.serviceId);
        if (!service || (isUnauthenticated() && !service.public)) response.status(404);
        response.send(service);
      },
    });
  } catch {}
}
