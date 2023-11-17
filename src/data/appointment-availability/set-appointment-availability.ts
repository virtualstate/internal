import { AppointmentAvailability, AppointmentAvailabilityData } from "./types";
import {
  getAppointmentAvailabilityStore
} from "./store";
import {v4} from "uuid";

export async function setAppointmentAvailability(
  data: AppointmentAvailabilityData & Partial<AppointmentAvailability>
): Promise<AppointmentAvailability> {
  const store = getAppointmentAvailabilityStore();
  const updatedAt = new Date().toISOString();
  const appointmentAvailabilityId = data.appointmentAvailabilityId || v4()
  const status = data.status || "scheduled";
  const document: AppointmentAvailability = {
    type: "appointment",
    status,
    createdAt: data.createdAt || updatedAt,
    ...data,
    appointmentAvailabilityId,
    updatedAt,
  };
  await store.set(data.appointmentAvailabilityId, document);
  return document;
}