import {AppointmentData, AppointmentStatus} from "./types";

export function isPendingAppointmentStatus(status: AppointmentStatus) {
    return (
        status === "confirmed" ||
        status === "scheduled"
    )
}

export function isPendingAppointment(appointment: Pick<AppointmentData, "status">) {
    return isPendingAppointmentStatus(appointment.status);
}