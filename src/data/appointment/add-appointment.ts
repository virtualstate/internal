import { v4 } from "uuid";
import { AppointmentData, Appointment } from "./types";
import { setAppointment } from "./set-appointment";

export async function addAppointment(data: AppointmentData): Promise<Appointment> {
  const appointmentId = v4();
  return setAppointment({
    ...data,
    appointmentId,
  });
}
