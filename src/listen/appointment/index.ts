import { FastifyInstance } from "fastify";
import { listAppointmentRoutes } from "./list-appointments";
import { addAppointmentRoutes } from "./add-appointment";
import { getAppointmentRoutes } from "./get-appointment";
import { setAppointmentRoutes } from "./set-appointment";
import { patchAppointmentRoutes } from "./patch-appointment";
import { getAppointmentAttendeesRoutes } from "./get-appointment-attendees";
import {setAppointmentStatusRoutes} from "./set-appointment-status";

export async function appointmentRoutes(fastify: FastifyInstance) {
  async function routes(fastify: FastifyInstance) {
    fastify.register(listAppointmentRoutes);
    fastify.register(addAppointmentRoutes);
    fastify.register(getAppointmentRoutes);
    fastify.register(setAppointmentRoutes);
    fastify.register(patchAppointmentRoutes);
    fastify.register(getAppointmentAttendeesRoutes);
    fastify.register(setAppointmentStatusRoutes);
  }

  fastify.register(routes, {
    prefix: "/appointments",
  });
}
