import { getAppointmentStore } from "./store";

export function getAppointment(id: string) {
  const store = getAppointmentStore();
  return store.get(id);
}
