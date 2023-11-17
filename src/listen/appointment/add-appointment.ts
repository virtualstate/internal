import {FastifyInstance} from "fastify";
import {addAppointment, AppointmentData, appointmentSchema, AttendeeData, happeningSchema} from "../../data";
import { authenticate } from "../authentication";
import {createAttendeeReferences} from "../../data/attendee/get-referenced-attendees";

export async function addAppointmentRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: Omit<AppointmentData, "attendees"> & {
      attendees: (string | AttendeeData)[]
    };
  };

  const response = {
    201: {
      description: "A new appointment",
      ...appointmentSchema.appointment,
    },
  };

  const schema = {
    description: "Add a new appointment",
    tags: ["appointment"],
    summary: "",
    body: appointmentSchema.appointmentData,
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
        const { attendees: attendeeReferences, ...rest } = request.body
        const attendees = await createAttendeeReferences(attendeeReferences);
        const appointment = await addAppointment({
          type: "appointment",
          ...rest,
          attendees: attendees.map(attendee => attendee.attendeeId)
        });
        response.status(201);
        response.send(appointment);
      },
    });
  } catch {}
}
