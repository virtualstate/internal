import { v4 } from "uuid";
import { AppointmentAvailabilityData, AppointmentAvailability } from "./types";
import { setAppointmentAvailability } from "./set-appointment-availability";

export async function addAppointmentAvailability(data: AppointmentAvailabilityData): Promise<AppointmentAvailability> {
  const appointmentAvailabilityId = v4();
  return setAppointmentAvailability({
    ...data,
    appointmentAvailabilityId,
  });
}
