import { FastifyInstance, FastifyRequest } from "fastify";
import { listAppointments, appointmentSchema } from "../../data";
import { authenticate } from "../authentication";
import {isUnauthenticated} from "../../authentication";

export async function listAppointmentRoutes(fastify: FastifyInstance) {
  const response = {
    200: {
      type: "array",
      items: appointmentSchema.appointment,
    },
  };

  const schema = {
    description: "List of appointments",
    tags: ["appointment"],
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
      preHandler: authenticate(fastify, { anonymous: true }),
      async handler(request: FastifyRequest, response) {
        response.send(await listAppointments({
          public: isUnauthenticated()
        }));
      },
    });
  } catch { }
}
