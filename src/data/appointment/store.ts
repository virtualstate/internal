import { Appointment } from "./types";
import {getHappeningStore} from "../happening";
import {DAY_MS} from "../expiring-kv";

const STORE_NAME = "appointment" as const;

export const DEFAULT_APPOINTMENT_NON_PENDING_EXPIRES_IN = 3 * DAY_MS;

export function getAppointmentStore() {
  return getHappeningStore<Appointment>(STORE_NAME, {
    counter: true
  });
}
