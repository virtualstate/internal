import {FastifyInstance} from "fastify";
import {getService, ServiceData, serviceSchema, setService} from "../../data";
import { authenticate } from "../authentication";

export async function patchServiceRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: Partial<ServiceData>;
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
    201: {
      description: "Updated service",
      ...serviceSchema.service,
    },
  };

  const schema = {
    description: "Update an existing service",
    tags: ["service"],
    summary: "",
    body: {
      ...serviceSchema.serviceData,
      properties: Object.fromEntries(
        Object.entries(serviceSchema.serviceData.properties)
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
    fastify.patch<Schema>("/:serviceId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const { serviceId } = request.params;
        const existing = await getService(serviceId);
        // Patch must have an existing service
        if (!existing) {
          response.status(404);
          return response.send();
        }
        const service = await setService({
          ...existing,
          ...request.body,
          createdAt: existing.createdAt,
          serviceId
        });
        response.status(200);
        response.send(service);
      },
    });
  } catch {
  }
}
