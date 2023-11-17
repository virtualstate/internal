import {FastifyInstance} from "fastify";
import {getAppointment, attendeeSchema, getAttendee} from "../../data";
import { authenticate } from "../authentication";
import {isUnauthenticated} from "../../authentication";

export async function getAppointmentAttendeesRoutes(fastify: FastifyInstance) {
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
      description: "A list of appointment attendees",
      type: "array",
      items: attendeeSchema.attendee
    },
  };

  const schema = {
    description: "List appointment attendees",
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
    fastify.get<Schema>("/:appointmentId/attendees", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const appointment = await getAppointment(request.params.appointmentId);
        const attendees = await Promise.all(
            appointment.attendees.map(getAttendee)
        )
        response.send(attendees);
      },
    });
  } catch {}
}
