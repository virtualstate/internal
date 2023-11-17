import {FastifyInstance} from "fastify";
import {getAppointment, AppointmentData, appointmentSchema, setAppointment} from "../../data";
import { authenticate } from "../authentication";
import {createAttendeeReferences} from "../../data/attendee/get-referenced-attendees";

export async function patchAppointmentRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: Partial<AppointmentData>;
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
    201: {
      description: "Updated appointment",
      ...appointmentSchema.appointment,
    },
  };

  const schema = {
    description: "Update an existing appointment",
    tags: ["appointment"],
    summary: "",
    body: {
      ...appointmentSchema.appointmentData,
      properties: Object.fromEntries(
        Object.entries(appointmentSchema.appointmentData.properties)
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
    fastify.patch<Schema>("/:appointmentId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const { appointmentId } = request.params;
        const existing = await getAppointment(appointmentId);
        // Patch must have an existing appointment
        if (!existing) {
          response.status(404);
          return response.send();
        }
        const { attendees: attendeeReferences, ...rest } = request.body
        let patch: Partial<AppointmentData> = rest;
        if (attendeeReferences) {
          const attendees = await createAttendeeReferences(attendeeReferences);
          patch = {
            ...patch,
            attendees: attendees.map(attendee => attendee.attendeeId),
          }
        }

        const appointment = await setAppointment({
          ...existing,
          ...patch,
          createdAt: existing.createdAt,
          appointmentId
        });
        response.status(200);
        response.send(appointment);
      },
    });
  } catch {
  }
}
