import {FastifyInstance} from "fastify";
import { addService, ServiceData, serviceSchema } from "../../data";
import { authenticate } from "../authentication";

export async function addServiceRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: ServiceData;
  };

  const response = {
    201: {
      description: "A new service",
      ...serviceSchema.service,
    },
  };

  const schema = {
    description: "Add a new service",
    tags: ["service"],
    summary: "",
    body: serviceSchema.serviceData,
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
        const service = await addService(request.body);
        response.status(201);
        response.send(service);
      },
    });
  } catch {}
}
