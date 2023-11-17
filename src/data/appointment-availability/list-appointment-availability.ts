import { AppointmentAvailability } from "./types";
import { getAppointmentAvailabilityStore } from "./store";

export interface ListAppointmentAvailabilityInput {}

export async function listAppointmentAvailability({}: ListAppointmentAvailabilityInput = {}): Promise<
  AppointmentAvailability[]
> {
  const store = getAppointmentAvailabilityStore();
  return store.values();
}
