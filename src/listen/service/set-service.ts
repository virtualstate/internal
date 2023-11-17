import {FastifyInstance} from "fastify";
import {getService, ServiceData, serviceSchema, setService} from "../../data";
import { authenticate } from "../authentication";

export async function setServiceRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: ServiceData;
    Params: {
      serviceId: string;
    }
  };

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
      description: "Updated service",
      ...serviceSchema.service,
    },
  };

  const schema = {
    description: "Update an existing service",
    tags: ["service"],
    summary: "",
    body: serviceSchema.serviceData,
    response,
    params,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  try {
    fastify.put<Schema>("/:serviceId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const { serviceId } = request.params;
        const existing = await getService(serviceId);
        const service = await setService({
          // Completely replace excluding created at
          // createdAt must come from the server
          ...request.body,
          createdAt: existing?.createdAt,
          serviceId
        });
        response.status(200);
        response.send(service);
      },
    });
  } catch {}
}
