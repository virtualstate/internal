import {FastifyInstance} from "fastify";
import { getAppointment, appointmentSchema } from "../../data";
import { authenticate } from "../authentication";
import {isUnauthenticated} from "../../authentication";

export async function getAppointmentRoutes(fastify: FastifyInstance) {
  const params = {
    type: "object",
    properties: {
      appointmentId: {
        type: "string",
      },
    },
    required: ["appointmentId"],
  };

  const response = {
    200: {
      description: "A appointment",
      ...appointmentSchema.appointment,
    },
  };

  const schema = {
    description: "Get a appointment",
    tags: ["appointment"],
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
      appointmentId: string;
    };
  };

  try {
    fastify.get<Schema>("/:appointmentId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const appointment = await getAppointment(request.params.appointmentId);
        if (!appointment || (isUnauthenticated() || !appointment.public)) response.status(404);
        response.send(appointment);
      },
    });
  } catch {}
}
