import { getAppointmentAvailabilityStore } from "./store";

export function getAppointmentAvailability(id: string) {
  const store = getAppointmentAvailabilityStore();
  return store.get(id);
}
