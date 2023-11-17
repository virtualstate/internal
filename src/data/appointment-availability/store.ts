import { AppointmentAvailability } from "./types";
import {getHappeningStore} from "../happening";

const STORE_NAME = "appointmentAvailability" as const;

export function getAppointmentAvailabilityStore() {
  return getHappeningStore<AppointmentAvailability>(STORE_NAME, {

  });
}
