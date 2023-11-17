import {FastifyInstance} from "fastify";
import {getAppointment, AppointmentData, appointmentSchema, setAppointment, AttendeeData} from "../../data";
import { authenticate } from "../authentication";
import {createAttendeeReferences} from "../../data/attendee/get-referenced-attendees";

export async function setAppointmentRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: Omit<AppointmentData, "attendees"> & {
      attendees: (string | AttendeeData)[]
    };
    Params: {
      appointmentId: string;
    }
  };

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
      description: "Updated appointment",
      ...appointmentSchema.appointment,
    },
  };

  const schema = {
    description: "Update an existing appointment",
    tags: ["appointment"],
    summary: "",
    body: appointmentSchema.appointmentData,
    response,
    params,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  try {
    fastify.put<Schema>("/:appointmentId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const { appointmentId } = request.params;
        const existing = await getAppointment(appointmentId);
        const { attendees: attendeeReferences, ...rest } = request.body
        const attendees = await createAttendeeReferences(attendeeReferences);
        const appointment = await setAppointment({
          type: "appointment",
          // Completely replace excluding created at
          // createdAt must come from the server
          ...rest,
          attendees: attendees.map(attendee => attendee.attendeeId),
          createdAt: existing?.createdAt,
          appointmentId
        });
        response.status(200);
        response.send(appointment);
      },
    });
  } catch {}
}
