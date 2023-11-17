import { Appointment } from "./types";
import { getAppointmentStore } from "./store";

export interface ListAppointmentsInput {}

export async function listAppointments({}: ListAppointmentsInput = {}): Promise<
  Appointment[]
> {
  const store = getAppointmentStore();
  return store.values();
}
