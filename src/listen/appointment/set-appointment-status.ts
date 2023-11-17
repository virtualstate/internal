import {FastifyInstance, FastifyReply, FastifyRequest} from "fastify";
import {
  getAppointment,
  AppointmentData,
  appointmentSchema,
  setAppointment,
  AttendeeData,
  AppointmentStatus
} from "../../data";
import { authenticate } from "../authentication";
import {createAttendeeReferences} from "../../data/attendee/get-referenced-attendees";

export async function setAppointmentStatusRoutes(fastify: FastifyInstance) {
  type Querystring = {
    redirect?: string;
  }

  type Schema = {
    Querystring: Querystring
    Params: {
      appointmentId: string;
      status: AppointmentStatus;
    }
  };

  const params = {
    type: "object",
    properties: {
      appointmentId: {
        type: "string",
      },
      status: appointmentSchema.appointment.properties.status,
    },
    required: ["appointmentId", "status"],
  };

  const response = {
    200: {
      description: "Updated appointment",
      ...appointmentSchema.appointment,
    },
  };

  const schema = {
    description: "Update an existing appointment status",
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

  async function handler(request: FastifyRequest<Schema>, response: FastifyReply) {
    const { appointmentId, status } = request.params;
    const existing = await getAppointment(appointmentId);
    if (!existing) {
      response.status(404);
      return response.send();
    }
    let appointment = existing;
    if (existing.status !== status) {
      const statusAt = new Date().toISOString();
      appointment = await setAppointment({
        ...existing,
        status,
        statusAt,
        history: [
          ...existing.history,
          {
            status,
            statusAt,
            updatedAt: statusAt
          }
        ]
      });
    }

    const { redirect } = request.query;
    if (redirect) {
      const url = redirect.replace(":appointmentId", appointmentId);
      response.header("Location", url);
      response.status(302);
      response.send();
      return;
    }

    response.status(200);
    response.send(appointment);
  }

  try {
    fastify.put<Schema>("/:appointmentId/status/:status", {
      schema,
      preHandler: authenticate(fastify),
      handler
    });
  } catch {}

  try {
    fastify.get<Schema>("/:appointmentId/status/:status", {
      schema,
      preHandler: authenticate(fastify),
      handler
    });
  } catch {}
}
