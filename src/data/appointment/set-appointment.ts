import { Appointment, AppointmentData } from "./types";
import {
  DEFAULT_APPOINTMENT_NON_PENDING_EXPIRES_IN,
  getAppointmentStore
} from "./store";
import {v4} from "uuid";
import {isPendingAppointment} from "./is-pending";
import {getExpiresAt} from "../expiring-kv";
import exp from "constants";

export async function setAppointment(
  data: AppointmentData & Partial<Appointment>
): Promise<Appointment> {
  const store = await getAppointmentStore();
  const updatedAt = new Date().toISOString();
  const statusAt = data.statusAt || updatedAt;
  const appointmentId = data.appointmentId || v4()
  const status = data.status || "scheduled";
  const document: Appointment = {
    type: "appointment",
    status,
    createdAt: data.createdAt || updatedAt,
    ...data,
    history: data.history || [
      {
        status,
        statusAt,
        updatedAt
      }
    ],
    appointmentId,
    updatedAt,
    statusAt,
  };
  if (!isPendingAppointment(document) && !document.expiresAt) {
    const expiresIn = getAppointmentNonPendingExpiresIn();
    if (expiresIn) {
      document.expiresAt = getExpiresAt(expiresIn);
    }
  }
  await store.set(data.appointmentId, document);
  return document;
}

export function getAppointmentNonPendingExpiresIn() {
  const {
    APPOINTMENT_NON_PENDING_EXPIRE,
    APPOINTMENT_NON_PENDING_EXPIRES_IN
  } = process.env;
  const expire = !!(
      APPOINTMENT_NON_PENDING_EXPIRE ||
      APPOINTMENT_NON_PENDING_EXPIRES_IN
  );
  if (!expire) return undefined;
  return +(APPOINTMENT_NON_PENDING_EXPIRES_IN ?? DEFAULT_APPOINTMENT_NON_PENDING_EXPIRES_IN);
}